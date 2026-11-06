# SoSoValue OpenAPI: verified contract notes

Researched 2026-11-06 for MarketGym's server-side read-only adapter.

**Provenance tags.** **[D]** means documented; the doc URL is given. **[O]** means observed from a real HTTP response on 2026-11-06, made without an API key. We have no API key, so no success payload has been observed. Every success-body claim below is [D] only.

**Sources.**
- Docs: https://sosovalue-1.gitbook.io/sosovalue-api-doc. Pages were read from `llms-full.txt`, and per-page `.md` variants return 200.
- OpenAPI 3.0 spec: https://static.sosovalue.com/2026/09/11/933b5fac-1903-4d07-9dd5-10751290fc34.json (`info.version` "2026-08-07"; linked from https://sosovalue-1.gitbook.io/sosovalue-api-doc/resources/openapi-specs-oas). The spec types `data` loosely. Field-level truth is on the doc pages.
- Every page in `llms.txt` was fetched successfully.

Fixtures: `lib/market-data/__fixtures__/sosovalue/*.json`. Each file holds `_source`, `_note`, `_endpoint`, `_envelope`, an optional `_edits`, then `code: 0`, `message: "success"`, and `data`. The `data` value is the doc example, kept verbatim and with its decimal text unchanged. The docs show only the `data` payload, so the fixtures add `code`/`message` from the documented envelope. `_edits` lists where a `...` / `[...]` placeholder had to be removed to make valid JSON.

---

## 1. Global contract

### Base URL and auth
- Base URL: `https://openapi.sosovalue.com/openapi/v1` [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/readme]. The OAS server is `https://openapi.sosovalue.com` with paths prefixed `/openapi/v1/...`.
- Every request needs the header `x-soso-api-key: <key>` [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/authentication]. The OAS declares it as the global `ApiKeyAuth` (apiKey, in: header).
- You get a key by registering at `https://sosovalue.com/developer/dashboard` → "Apply your Key". The application is reviewed: the status goes pending → approved [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/setting-up-your-api-key]. **Blocking: we do not have a key.**
- All endpoints below are `GET`. The docs list no POST in v1.

### Success envelope [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/response-format]
```json
{
    "code": 0,
    "message": "success",
    "data": { ... }
}
```
- The key is `message`, not `msg`. `code` is an integer and is `0` on success.
- `data` takes one of four shapes:
  - an object (snapshot endpoints)
  - an array (time-series endpoints and simple lists)
  - a paginated object `{ "list": [...], "page": 1, "page_size": 20, "total": 542 }`
  - `null` (empty)

### Error envelope [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/error-responses]
`{ "code": <int>, "message": <string>, "details": { ... } }`. There is no `data` key, and `details` is optional (OAS `V1Error`).

| code | HTTP | meaning |
|---|---|---|
| 400001 | 400 | Invalid parameter format |
| 400002 | 400 | Missing required parameter |
| 400003 | 400 | Invalid parameter value (enum) |
| 400101 | 401 | Invalid API Key |
| 400102 | 401 | API Key expired |
| 400301 | 403 | Insufficient permissions |
| 400401 | 404 | Resource not found |
| 400402 | 404 | Endpoint not found |
| 402901 | 429 | Too many requests |
| 500001 | 500 | Internal server error |
| 500301 | 503 | Service temporarily unavailable |

### Observed unauthenticated behaviour [O, 2026-11-06, curl, no key]
| Request | HTTP | Content-Type | Body |
|---|---|---|---|
| `GET /openapi/v1` (bare base) | 403 | text/html | Cloudflare "Attention Required!" HTML page |
| `GET /openapi/v1/does-not-exist` | 403 | text/html | same Cloudflare HTML. **Not** the documented 404/`400402` JSON |
| `GET /currencies`, `/currencies/1673723677362319866/market-snapshot`, `/market/overview`, `/etfs/summary-history?symbol=BTC&country_code=US`, `/indices`, `/news/pick?page=1&page_size=20`, `/macro/events` (no header) | 401 | application/json | `{"code":400101,"message":"API Key is invalid or does not exist"}` |
| `GET /market/overview` with `x-soso-api-key: invalid-test-key` | 401 | application/json | `{"code":400101,"message":"API Key is invalid or does not exist. Please verify the value with SoSoValue for confirmation."}` |

- The 401 bodies had **no `details`** and no `data`.
- No `X-RateLimit-*` headers appeared on the 401 responses.
- A 401 JSON response tells you the route exists. A 403 HTML response means an unknown route, or the bare base, blocked at Cloudflare.
- Adapter rule: check the HTTP status and `Content-Type` before parsing JSON.

### Rate limits [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/rate-limit]
- Limits apply per API key: **20 requests/minute** and **100,000 requests/month**.
- 100k/month averages about 2.3 req/min sustained. A server-side cache is mandatory, so do not proxy each client request.
- Response headers:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset` (Unix **ms**)
- Exceeding the limit returns HTTP **429**. Doc example, verbatim:
```json
{
    "code": 42901,
    "message": "Rate limit exceeded",
    "details": {
        "limit": 20,
        "window": "60s",
        "retry_after": 45
    }
}
```
(The code conflicts with the error table; see Ambiguities.)

### Pagination and time windows [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/query-modes]
- **Paginated** endpoints take `page` (int, default 1, starts at 1) and `page_size` (int, default 20, max 100). The response `data` is `{list, page, page_size, total}`.
- **Time-window** endpoints take `start_time` / `end_time` (long, **ms** Unix) and `limit`.
  - Results are ascending.
  - If the range exceeds `limit`, you get the *earliest* `limit` rows.
  - With no times given, you get the most recent `limit` rows.
  - To get the next page, pass the last row's `timestamp + 1` as `start_time`.
- Range caps:
  - Klines: `1d` only, last 3 months.
  - ETF history: last 1 month.
  - Feeds `start_time`/`end_time`: last 7 days.
- Some endpoints don't follow these rules:
  - ETF and macro endpoints use `start_date`/`end_date` strings (`yyyy-MM-dd`, inclusive per OAS `V1StartDate`), not ms.
  - ETF summary history and macro event history are **newest first**.

### Timestamps, units, naming [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/query-modes]
- "All timestamp fields are **UTC millisecond** Unix timestamps."
- "All monetary fields are denominated in **USD** by default."
- All field names are snake_case.
- Timestamps come in several types:
  - Klines `timestamp`, news `release_time`, and `as_of` are numbers (Long).
  - `ath_date`, `cycle_low_date`, `first_issue_time` and `significant_events[].time` are **numeric strings**.
  - ETF and macro `date` fields are `yyyy-MM-dd` strings. The docs state no timezone for these; treat them as the market/trading date.
- Large or precise values: the market snapshot examples carry 16–18 decimal places, and `/market/overview` returns numbers **as strings**. Parse with a decimal library, or accept float precision loss deliberately.

---

## 2. Endpoints

### 2.1 Currency list: `GET /currencies` [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/list]
- Params: none. Returns all listed currencies. Updates every 1 min [D endpoint-overview].
- `data`: array of `{ currency_id: String, symbol: String, name: String }`.
- Use this list to resolve BTC/ETH → `currency_id`. Do not hardcode IDs (see Ambiguities).
- Fixture: `currencies.list.json`. Example, verbatim:
```json
[
    {
        "currency_id": "1673723677362319867",
        "symbol": "eth",
        "name": "Ethereum"
    },
    ...
]
```

### 2.2 Currency market snapshot: `GET /currencies/{currency_id}/market-snapshot` [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/market-snapshot]
- Path param: `currency_id` (String, required). Updates every 30 s.
- 404 → `400401` per OAS.

| field | type | doc description |
|---|---|---|
| price | BigDecimal | Current price (USD) |
| change_pct_24h | BigDecimal | 24-hour price change percentage. Unit not stated; see Ambiguities |
| turnover_24h | BigDecimal | 24-hour trading volume (USD) |
| turnover_rate | BigDecimal | Turnover rate |
| high_24h / low_24h | BigDecimal | 24-hour high / low price |
| marketcap | BigDecimal | Market capitalization |
| fdv | BigDecimal | Fully diluted valuation |
| max_supply | String | Maximum supply; null = unlimited |
| total_supply / circulating_supply | String | supply |
| ath / ath_date | BigDecimal / String(ts) | All-time high, and its date |
| down_from_ath | String | % declined from ATH (example `""`) |
| cycle_low / cycle_low_date | BigDecimal / String(ts) | cycle low |
| up_from_cycle_low | String | % recovered from cycle low (example `""`) |
| marketcap_rank | Integer | Market cap rank |

Fixture: `currencies.market-snapshot.json`. Example, verbatim:
```json
{
    "price": 458.0000000000000000,
    "change_pct_24h": -0.12,
    "turnover_24h": 4381082458.0000000000000000,
    "turnover_rate": 0.123,
    "high_24h": 208.320000000000000000,
    "low_24h": 195.140000000000000000,
    "marketcap": 98187284636.4000000000000000,
    "fdv": 119634407517.24000000,
    "max_supply": "593383314",
    "total_supply": "593383314",
    "circulating_supply": "487043475",
    "ath": 295.830000000000000000,
    "ath_date": "1737244800000",
    "down_from_ath": "",
    "cycle_low": 175.890000000000000000,
    "cycle_low_date": "1738540800000",
    "up_from_cycle_low": "",
    "marketcap_rank": 4
}
```

### 2.3 Currency klines: `GET /currencies/{currency_id}/klines` [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/klines]
- Query params:
  - `interval` (string, **required**; only `1d`)
  - `start_time` / `end_time` (ms)
  - `limit` (default 100, max 500)
- Range is limited to the last 3 months.
- `data`: array, ascending, of `{ timestamp: Long ms, open, high, low, close, volume: Number }`.
- Fixture: `currencies.klines.json`.
```json
[
    {
        "timestamp": 1710000000000,
        "open": 123,
        "high": 130,
        "low": 120,
        "close": 125,
        "volume": 100000
    }
]
```

### 2.4 Market overview: `GET /market/overview` [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/10.-market-overview/overview]
- Params: none. Cached for 30 s, so polling faster than 30 s returns identical values.
- Fields (all **String** except `as_of`):

| field | type | doc description |
|---|---|---|
| total_market_cap | String | USD |
| total_market_cap_change_pct | String | 24h change as a **percentage**: `"0.6"` = 0.6% |
| total_volume_24h | String | USD |
| eth_gas_gwei | String | Gwei |
| btc_gas_sat_vb | String | sat/vB |
| as_of | Number | ms epoch |

- **Any field except `as_of` may be omitted** if its upstream source is down. The response is still 200.
- Historical series come from Analysis Charts instead (`total_crypto_market_cap`, `fgi_indicator`).
- Fixture: `market.overview.json`.
```json
{
    "total_market_cap": "2280614829402.85",
    "total_market_cap_change_pct": "0.6",
    "total_volume_24h": "40122576829.22",
    "eth_gas_gwei": "0.126601389",
    "btc_gas_sat_vb": "6",
    "as_of": 1785911722870
}
```

### 2.5 ETF aggregate flows: `GET /etfs/summary-history` [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/2.-etf/summary-history]
- Query params:
  - `symbol` (**required**, case-insensitive; US: BTC ETH SOL LTC HBAR XRP DOGE LINK AVAX DOT; HK: BTC ETH SOL)
  - `country_code` (**required**: `US` | `HK`)
  - `start_date` / `end_date` (string; last 1 month only)
  - `limit` (default 50, max 300)
- Errors: a symbol outside the enum → `400003`. A valid symbol with no listing in that country (e.g. LTC+HK) → `400001` "Unsupported ETF category…".
- `data`: array, **newest first**, with non-trading days excluded:
  - `date` (String `yyyy-MM-dd`)
  - `total_net_inflow` (BigDecimal USD; negative = net outflow)
  - `total_value_traded` (USD)
  - `total_net_assets` (USD, the aggregate AUM)
  - `cum_net_inflow` (USD since launch)
- Fixture: `etfs.summary-history.json`.
```json
[
    {
        "date": "2024-04-12",
        "total_net_inflow": -55066297.0000000000000000,
        "total_value_traded": 4706120449.0000000000000000,
        "total_net_assets": 56216535367.0000000000000000,
        "cum_net_inflow": 13534833596.0950000000000000
    },
    {
        "date": "2024-04-11",
        "total_net_inflow": 91269283.0000000000000000,
        "total_value_traded": 2498627928.0000000000000000,
        "total_net_assets": 59225065270.0000000000000000,
        "cum_net_inflow": 12581438056.0950000000000000
    }
]
```

### 2.6 ETF list: `GET /etfs` [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/2.-etf/list]
- Query params: `symbol` and `country_code`, both required, same enums and errors as 2.5.
- `data`: array of `{ ticker, name, exchange }` (all String).
- Fixture: `etfs.list.json`.
```json
[
    {
        "ticker": "IBIT",
        "name": "iShares Bitcoin Trust",
        "exchange": "NASDAQ"
    },
    {
        "ticker": "FBTC",
        "name": "Fidelity Wise Origin Bitcoin Fund",
        "exchange": "CBOE"
    }
]
```

### 2.7 Per-ETF snapshot: `GET /etfs/{ticker}/market-snapshot` [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/2.-etf/market-snapshot]
- Path param: `ticker`.
- Always returns the **latest settled** figures.
- Fields:
  - `date` (typed "Long (timestamp)", but the example is `"2024-04-12"`; see Ambiguities)
  - `ticker`
  - `sponsor_fee` (Number; "Management fee"; example 0.003 reads as a fraction)
  - `net_inflow`, `cum_inflow`, `net_assets`, `value_traded` (USD)
  - `mkt_price`
  - `prem_dsc` (premium/discount rate)
  - `volume` (share volume)
- Fixture: `etfs.market-snapshot.json`.
```json
{
    "date": "2024-04-12",
    "ticker": "IBIT",
    "sponsor_fee": 0.003,
    "net_inflow": 3000000,
    "cum_inflow": 400000000,
    "net_assets": 5000000,
    "mkt_price": 14.5,
    "prem_dsc": -0.0001,
    "value_traded": 4441000000,
    "volume": 322302
}
```

### 2.8 Per-ETF history: `GET /etfs/{ticker}/history` [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/2.-etf/history]
- Params:
  - `ticker` (path)
  - `start_date` / `end_date` (query; last 1 month only)
  - The OAS also lists `limit` (default 50, max 300, "from start_date"); the doc page doesn't.
- Fields:
  - `date` (`YYYY-MM-DD`)
  - `ticker`
  - `net_inflow`, `cum_inflow`, `net_assets`, `value_traded`
  - `currency_share` (market share)
  - `prem_dsc`
  - `volume`
- **T+1 settlement:** the newest row has `null` flow and asset fields. Skip rows where `net_inflow` is null, or use 2.7.
- **Known bug [D]:** `volume` here equals `value_traded` (USD) and is returned as a JSON string. Do not use it.
- Fixtures: `etfs.history.json` and `etfs.history.unsettled-row.json`.
```json
[
    {
        "date": "2024-04-12",
        "ticker": "IBIT",
        "net_inflow": 3000000,
        "cum_inflow": 400000000,
        "net_assets": 5000000,
        "currency_share": 0.005,
        "prem_dsc": -0.0001,
        "value_traded": 4441000000,
        "volume": 322302
    }
]
```
Unsettled-row example, verbatim (contains a literal `"...": "..."` key):
```json
[
    {
        "date": "2026-08-12",
        "ticker": "IBIT",
        "net_inflow": null,
        "cum_inflow": null,
        "net_assets": null,
        "currency_share": null,
        "prem_dsc": null,
        "value_traded": 910925300,
        "volume": "910925300"
    },
    {
        "date": "2026-08-11",
        "ticker": "IBIT",
        "net_inflow": 50195600,
        "cum_inflow": 61171454223.66,
        "net_assets": 47337319120,
        "...": "..."
    }
]
```

### 2.9 Index list: `GET /indices` [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/list]
- Params: none.
- `data`: a **bare array of ticker strings**. Fixture: `indices.list.json`.
```json
["ssimag7", "ssilayer1"]
```

### 2.10 Index constituents: `GET /indices/{index_ticker}/constituents` [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/constituents]
- `data`: array of `{ currency_id: String, symbol: String, weight: Number (0-1) }`.
- Fixture: `indices.constituents.json`.
```json
[
    {
        "currency_id": "1673723677362319867",
        "symbol": "btc",
        "weight": 0.31
    }
]
```

### 2.11 Index snapshot: `GET /indices/{index_ticker}/market-snapshot` [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/market-snapshot]
- `index_ticker` is case-insensitive. The list and constituents endpoints echo it as `ssiMAG7`.
- Fields:
  - `price`
  - `change_pct_24h`, `roi_7d`, `roi_1m`, `roi_3m`, `roi_1y`, `ytd`. All are **decimal fractions**: `-0.0016` = −0.16%.
- Fields with no value are **omitted**, not null.
- Fixture: `indices.market-snapshot.json`.
```json
{
    "price": 20.93,
    "change_pct_24h": -0.0016,
    "roi_7d": 0.0056,
    "roi_1m": 0.062,
    "roi_3m": 0.275,
    "roi_1y": 0.15,
    "ytd": -0.243
}
```

### 2.12 Index klines: `GET /indices/{index_ticker}/klines` [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/klines]
- Same params as 2.3: `interval=1d` required; `limit` default 100, max 500; last 3 months.
- Rows are `{timestamp, open, high, low, close}`, with **no `volume`**.
- Fixture: `indices.klines.json`.
```json
[
    {
        "timestamp": 1710000000000,
        "open": 123,
        "high": 130,
        "low": 120,
        "close": 125
    }
]
```

### 2.13 Featured news: `GET /news/pick` [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/6.-feeds/featured-news]
- Query params:
  - `page` (**required**, ≥1)
  - `page_size` (**required**, **20–100**)
  - `language` (en default; also zh tc ja vi es pt ru tr fr)
  - `category` (comma-separated ints; see 2.14)
- `data`: paginated `{page, page_size, total, list}`. List items are the same as 2.14 minus `original_link` and the engagement counts.
- Fixture: `news.pick.json` (edit: the `matched_currencies: [...]` placeholder became `[]`).
```json
{
    "page": 1,
    "page_size": 20,
    "total": 115,
    "list": [
        {
            "id": "news123",
            "source_link": "https://sosovalue.xyz/research/xxx",
            "release_time": 1677151845000,
            "title": "Pick Article Title",
            "content": "<p>HTML formatted body...</p>",
            "author": "Author Name",
            "author_description": "Senior crypto researcher",
            "author_avatar_url": "https://...",
            "nick_name": "Author Display ®",
            "is_blue_verified": 1,
            "verified_type": "Business",
            "category": 2,
            "feature_image": "https://xxx.png",
            "matched_currencies": [...],
            "tags": ["ETF", "BTC"],
            "media_info": [
                {
                "soso_url": "https://static.xxx.com/example.jpg",
                "original_url": "",
                "short_url": "https://t.co/example",
                "type": "photo"
                }
            ],
            "quote_info": null
        }
    ]
}
```

### 2.14 News feed / research: `GET /news` [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/6.-feeds/news]
- Query params:
  - `category`: 1 news, **2 research**, 3 institution, 4 insights/KOL, 7 announcement, 13 crypto-stock news
  - `language`
  - `currency_id`
  - `project_id`
  - `page`, `page_size` (default 20, max 100)
  - `start_time` / `end_time` (ms; filters `release_time`; last 7 days only)
- Key item fields:
  - `id` (String)
  - `source_link`, `original_link`
  - `release_time` (Long ms)
  - `title` (String, **may be null**)
  - `content` (HTML string; allowed tags listed on the page)
  - `author`
  - `category` (Integer)
  - `feature_image`
  - `matched_currencies[] {id, full_name, name}` (may be empty)
  - `tags[]`
  - `media_info[] {soso_url, original_url, short_url, type}`
  - `quote_info` (Object | null)
- Ordering is platform display order.
- Fixture: `news.feed.json` (edit: `quote_info.media_info: [...]` became `[]`).
- There is no separate "research" endpoint. Use `category=2`.
```json
{
    "page": 1,
    "page_size": 20,
    "total": 335,
    "list": [
        {
            "id": "news1",
            "source_link": "https://sosovalue.xyz/research/1762712251829850112",
            "original_link": "https://sosovalue.xyz/research/1762712251829850112",
            "release_time": 1677151845000,
            "title": "The Rise and Fall of the Roman Empire",
            "content": "<p>HTML formatted content...</p>",
            "author": "Author Name",
            "author_description": "Crypto analyst & researcher",
            "author_avatar_url": "https://...",
            "impression_count": 432,
            "like_count": 6,
            "reply_count": 0,
            "retweet_count": 3,
            "category": 1,
            "feature_image": "https://...",
            "nick_name": "Shirtum ®",
            "is_blue_verified": 1,
            "verified_type": "Business",
            "matched_currencies": [
                {
                    "id": "1673723677362319866",
                    "full_name": "BITCOIN",
                    "name": "BTC"
                }
            ],
            "tags": ["ETF", "DO KWON", "TERRAFORM LABS", "SEC"],
            "media_info": [
                {
                    "soso_url": "https://static.sosovalue.com/media/example.jpg",
                    "original_url": "",
                    "short_url": "https://t.co/example",
                    "type": "photo"
                }
            ],
            "quote_info": {
                "content": "Quoted tweet content",
                "impression_count": 903,
                "like_count": 18,
                "reply_count": 6,
                "retweet_count": 3,
                "created_at": 1724687710000,
                "media_info": [...],
                "original_url": "https://x.com/user/status/1828098871874007446",
                "author_avatar_url": "https://...",
                "author": "Shirtum",
                "nick_name": "Shirtum ®",
                "is_blue_verified": 1,
                "verified_type": "Business"
            }
        }
    ]
}
```

### 2.15 Macro calendar: `GET /macro/events` [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/8.-macro/events]
- Params: none. The docs don't say which date range is returned.
- `data`: array of `{ date: String, events: String[] }`. Fixture: `macro.events.json`.
```json
[
    {
        "date": "2026-03-03",
        "events": ["Nonfarm Payrolls", "CPI"]
    }
]
```

### 2.16 Macro event history: `GET /macro/events/{event}/history` [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/8.-macro/event-history]
- Params:
  - `event` (path): the exact name from 2.15, URL-encoded, e.g. `CPI%20(YoY)`
  - `start_date` / `end_date` (`yyyy-MM-dd`, inclusive)
  - `limit` (default 50, max 100, silently clamped)
- Rows: `{date, actual, forecast, previous}`, newest first.
- All values are **strings with embedded units** (`"3.5%"`, `"53.6"`). An unreleased value is `""`, not null.
- An unknown event returns **HTTP 200 with `data: []`**, not 404.
- Fixture: `macro.event-history.json`.
```json
[
    {
        "date": "2026-07-14",
        "actual": "3.5%",
        "forecast": "3.8%",
        "previous": "4.2%"
    },
    {
        "date": "2026-08-05",
        "actual": "",
        "forecast": "53.6",
        "previous": "51.2"
    }
]
```

### Not used, but they exist [D https://sosovalue-1.gitbook.io/sosovalue-api-doc/endpoint-overview]
- **Currency:**
  - `/currencies/{id}` (info)
  - `/token-economics`
  - `/supply`
  - `/pairs` (paginated)
  - `/currencies/sector-spotlight`
  - `/fundraising`
- **Crypto stocks:** `/crypto-stocks*`
- **BTC treasuries:** `/btc-treasuries*`
- **News:**
  - `/news/hot`: `id` is a Long here
  - `/news/search`: `keyword` is required; its doc example is the only one shown *with* the full envelope
- **Podcasts:** `/podcasts/{podcastId}`
- **Fundraising:** `/fundraising/projects*`
- **Macro rates:**
  - `/macro/rates`
  - `/macro/rates/{code}/history`
  - `/macro/fomc-probabilities`
- **Analysis charts:** `/analyses`, `/analyses/{chart_name}` (Fear & Greed is `fgi_indicator`)
- **v3 Market Data API:** `/openapi/v3/...`, with a different envelope `{code,status,resolved,data,meta,pagination,warnings}`.

---

## 3. Recommended endpoints for MarketGym

| Need | Endpoint | Cache TTL (suggested) | Key fields |
|---|---|---|---|
| ID resolution | `GET /currencies` | 24 h | `currency_id`, `symbol` (match case-insensitively) |
| BTC/ETH snapshot | `GET /currencies/{id}/market-snapshot` (one call per asset) | 60 s | `price`, `change_pct_24h`, `turnover_24h` (volume), `marketcap`, `high_24h`, `low_24h`, `marketcap_rank` |
| Price chart | `GET /currencies/{id}/klines?interval=1d&limit=90` | 1 h | `timestamp` (ms), OHLC, `volume` |
| Market headline | `GET /market/overview` | 60 s | `total_market_cap`, `total_market_cap_change_pct` (%), `total_volume_24h`, `as_of` |
| ETF flows | `GET /etfs/summary-history?symbol=BTC\|ETH&country_code=US&limit=30` | 1 h | `date`, `total_net_inflow`, `total_net_assets` (AUM), `cum_net_inflow`, `total_value_traded` |
| Per-ETF | `GET /etfs?symbol=BTC&country_code=US` → `GET /etfs/{ticker}/market-snapshot` | 24 h / 1 h | `ticker`, `name`, `net_inflow`, `net_assets`, `prem_dsc`, `sponsor_fee` |
| Indexes | `GET /indices` → `/{t}/constituents` + `/{t}/market-snapshot` | 24 h / 1 h / 5 min | `symbol`, `weight` (0–1); `price`, `change_pct_24h`, `roi_*`, `ytd` (fractions) |
| News | `GET /news/pick?page=1&page_size=20` (+ `&category=2` for research) | 5 min | `id`, `title` (nullable), `content` (HTML, sanitise), `release_time` (ms), `source_link`, `matched_currencies`, `tags` |
| Macro (optional) | `GET /macro/events` | 6 h | `date`, `events` |

**Request budget.**
- A full refresh is about 10 calls.
- At 20 req/min, refreshes must be serialised and cached server-side.
- At 100k/month, polling the snapshot, overview and news at the TTLs above costs about 2×1440 + 1440 + 288 ≈ 4.6k calls/day ≈ 140k/month. **That is over quota**, so use TTLs of at least 2 min for snapshots, or refresh on demand behind a cache.
- Handle the 429 response and use `retry_after` / `X-RateLimit-Reset`.

**Normalisation the adapter must do.**
- Percent units differ by endpoint:
  - Index snapshot: decimal fraction.
  - Market overview: percent string.
  - Currency snapshot: unknown.
- Timestamps come as numbers, numeric strings, or `yyyy-MM-dd` dates.
- Numbers come as BigDecimal JSON, strings, or omitted keys.
- ETF history needs T+1 null-skipping.
- News `title` can be null, and `content` is HTML that must be sanitised.

---

## 4. Ambiguities and doc inconsistencies

1. **Rate-limit error code.** The Rate Limit page shows `42901` with `details.{limit,window,retry_after}`. The error table and OAS say `402901`. Treat HTTP 429 as authoritative.
2. **Error example codes.** The Error Responses page's structure example uses `40001`, but the table uses 6-digit `400001`. The auth example shows `details.header: "X-API-KEY"`, while the real header is `x-soso-api-key`.
3. **Real 401 vs doc.** The observed message was `"API Key is invalid or does not exist"` and had no `details`. The doc example has message `"Invalid API Key"` plus `details`. Never match on `message`.
4. **Unknown routes.** These return a Cloudflare 403 HTML page [O], not the documented 404 `400402` JSON.
5. **`change_pct_24h` unit on the currency snapshot is unstated.** Example `-0.12`. The index snapshot uses fractions explicitly, while the market overview uses percent. **Verify against a live response before display.**
6. **BTC `currency_id` is not reliably documented:**
   - The news examples use `1673723677362319866` for BTC.
   - The currency list and info examples use `1673723677362319867` for ETH.
   - The index-constituents example pairs `1673723677362319867` with symbol `btc`.
   - Resolve the ID via `/currencies` at runtime.
7. **Symbol case varies.** The list example has `"eth"`, the info example `"ETH"`, and constituents `"btc"`.
8. **Inconsistent example data.**
   - The currency snapshot example has `price` 458 but `high_24h` 208 and `ath` 295.83, so it is not internally consistent.
   - The currency info example has `name` "ethereum" with a Bitcoin introduction.
   - Don't write assertions on these values beyond shape.
9. **ETF snapshot `date`** is typed `Long (timestamp)`, but the example is `"2024-04-12"`. Accept both.
10. **ETF history params.** The page lists `start_date`/`end_date` under "Path Parameters", but they are query params per OAS. The OAS-only `limit` is described as "from start_date".
11. **Ordering conflict.** The global time-window rule says ascending, but ETF summary history and macro history are documented newest first.
12. **News.** The 6.1 notes say "Maximum 200 news items per request", but `page_size` max is 100. Hot news `id` is a Long, other news `id` is a String.
13. **Index path param.** The constituents and klines pages name the path param `ticker`, and type it `Array[String]` on constituents, but the path template is `{index_ticker}`. Treat it as a single string.
14. **`yyyy-MM-dd` dates have no timezone stated.** ETF dates are US trading days.
15. **No success response was observed** (no key). All field-level claims are documentation-only until a key is issued.
