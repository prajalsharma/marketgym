# SoDEX public market data: verified contract (spot)

Scope: read-only, unauthenticated GET market data for the Order Book Gym.
Only public `/markets/*` GETs were called. No account, order, cancel, transfer, or signed (EIP-712) endpoint was called, and no keys were generated.

Tags:
- **[doc]** is documented, with the source URL.
- **[obs]** is observed in a real call on 2026-11-06 between 05:41:56Z and 05:43:11Z. The fixtures in `lib/market-data/__fixtures__/sodex/` hold the exact capture times.

Docs entry: `https://sodex.com/documentation/api/api` redirects (301 to `docs.sodex.com/api/api`, then on to) `https://docs.sodex.com/for-developers/api-reference/trading-api` [obs]. The docs site is GitBook. Appending `.md` to any page URL returns clean Markdown, and the index is at `https://docs.sodex.com/llms.txt` [obs].

Abbreviations for doc URLs below:
- `TA` = https://docs.sodex.com/for-developers/api-reference/trading-api
- `REST` = `TA`/rest-v1
- `SPOT` = `TA`/rest-v1/sodex-rest-spot-api
- `SCHEMA` = `TA`/rest-v1/schema
- `RL` = https://docs.sodex.com/for-developers/developers/trading/api-rate-limits

Note: the "Market Data API" section of the same docs (`https://openapi.sosovalue.com/openapi/v1`) is the SoSoValue data product (ETFs, news, indices). It is **not** the exchange order book. Do not use it for this.

## 1. Base URLs [doc: TA, REST]

| Net | Spot REST | Perps REST | Spot WS |
|---|---|---|---|
| Mainnet | `https://mainnet-gw.sodex.dev/api/v1/spot` | `https://mainnet-gw.sodex.dev/api/v1/perps` | `wss://mainnet-gw.sodex.dev/ws/spot` |
| Testnet | `https://testnet-gw.sodex.dev/api/v1/spot` | `https://testnet-gw.sodex.dev/api/v1/perps` | `wss://testnet-gw.sodex.dev/ws/spot` |

The public (non-market) base is `https://{net}-gw.sodex.dev/api/v1` [doc: REST].

- Auth: "Public market-data endpoints are unsigned." Only the header `Accept: application/json` is needed [doc: REST]. [obs] Every call below returned HTTP 200 with no auth, from a Kathmandu (KTM) Cloudflare edge. No geo-block was seen.
- CORS: [obs] `access-control-allow-origin: *`. We still call it server-side.
- `HEAD` is not supported. [obs] `HEAD /markets/bookTickers` returned `404 text/plain`. Use GET.

## 2. Response envelope [doc: REST "Response Format"]

`{ code: number, timestamp: uint64 (server time, ms), data?: <payload>, error?: string }`. Success is `code === 0`.

[obs] Errors still return **HTTP 200**, so you must check `code`. Example for an unknown symbol:
`GET .../markets/BTC_USDC/orderbook?limit=5` returns `200 {"code":-1,"timestamp":1793943750734,"error":"symbol not found"}`. See fixture `mainnet-error-symbol-not-found.json`.

## 3. Types and units

- `DecimalString`: every price, quantity, size, fee and ratio is a **JSON string** [doc: SCHEMA; obs]. The docs say "Keep decimal values as strings" [doc: https://docs.sodex.com/for-developers/developers/trading/spot-trading]. Parse with a decimal library, not `Number`, when you check tick or lot multiples.
- All timestamps are **uint64 milliseconds since the Unix epoch** (`timestamp`, `blockTime`, `openTime`, `closeTime`, trade `T`, kline `t`) [doc: SCHEMA; obs, e.g. `1793943745796`].
- `changePct` is a JSON **number** in percent (e.g. `-6.06` means -6.06%) [doc: SCHEMA; obs].
- [obs] Gotcha: in klines, decimal strings are not normalised. The newest candle came back as `"75680"`, older ones as `"75820.000000000000000000"`. Normalise before you compare.
- `maxPrice`, `maxQuantity`, `marketMaxQuantity` and `maxNotional` = `"0"`: [obs] on every symbol checked. This means "no limit". That is inferred, not documented.

## 4. Symbol format

- `{BASE}_{QUOTE}` using on-chain coin names. Most bases carry a `v` prefix, e.g. `vBTC_vUSDC`, `vETH_vUSDC`, `WSOSO_vUSDC` [doc: SPOT examples; obs].
- The UI label is `displayName`, e.g. `BTC/USDC` [doc; obs].
- `BTC_USDC` is rejected with "symbol not found" [obs].
- Symbol counts [obs]:
  - Mainnet: 43 symbols, all quoted in vUSDC, some `status:"HALT"`.
  - Testnet: 33 symbols, including test assets such as `TESTBTC_vUSDC`.
- By 24h quote volume, mainnet's busiest were [obs]: `WSOSO_vUSDC` (~559k USDC), `vBTC_vUSDC` (~55k), `vSOL_vUSDC` (~14k). Liquidity is thin overall.

## 5. Endpoints (spot; perps mirror these under `/perps`) [doc: SPOT]

All are `GET`. Paths are relative to the Spot REST base.

| Endpoint | Path | Params | `data` type | Weight [doc: RL] | Observed (mainnet / testnet) |
|---|---|---|---|---|---|
| Symbols | `/markets/symbols` | `symbol?` | `SpotSymbol[]` | 2 | 200, 0.44–3.7 s / 0.44 s |
| Coins | `/markets/coins` | `coin?` | `SpotCoin[]` | 2 | 200, 0.78 s / 0.23 s |
| Tickers (24h) | `/markets/tickers` | `symbol?` | `SpotTicker[]` | 2 | 200, 0.47–0.77 s / 0.33 s |
| Mini tickers | `/markets/miniTickers` | `symbol?` | `MiniTicker[]` | 2 | not called |
| Book tickers (best bid/ask) | `/markets/bookTickers` | `symbol?` | `BookTicker[]` | 2 | 200, 0.27 s / 0.91 s |
| **Order book** | `/markets/{symbol}/orderbook` | `limit?` uint32, default **10**, max **1000** | `OrderBook` | 5 (≤100), 10 (101–500), 20 (>500) | 200, 0.22–1.2 s (5 repeats: 0.22–0.25 s) / 0.22–0.32 s |
| Klines | `/markets/{symbol}/klines` | `interval` (required: `1m 3m 5m 15m 30m 1h 4h 6h 8h 12h 1d 3d 1w 1M`, case-sensitive), `startTime?` ms, `endTime?` ms, `limit?` default 500, max 1500 | `RPCKline[]` | 20 + extra | 200, 0.28–0.32 s |
| Recent trades | `/markets/{symbol}/trades` | `limit?` default 50, max 500 | `Trade[]` | 20 | 200, 0.21 s |

[obs] The `?symbol=` filter works on `/markets/symbols` and `/markets/tickers`: it returns a one-element array. With no `limit`, the order book returned 10 levels per side, which matches the documented default.

### SpotSymbol [doc: SCHEMA#spotsymbol; obs]
These are the tick size, lot size and precision fields:

- `id` uint64. Use this as `SYMBOL_ID`.
- `name`, `displayName` (strings).
- `baseCoinID`, `baseCoin`, `baseCoinPrecision`, `quoteCoinID`, `quoteCoin`, `quoteCoinPrecision`.
- Price filter:
  - `pricePrecision` int32: decimal places of the price.
  - `tickSize` DecimalString.
  - `minPrice`, `maxPrice`.
- Lot size filter:
  - `quantityPrecision` int32.
  - `stepSize` DecimalString. **Lot size is called `stepSize`.**
  - `minQuantity`, `maxQuantity`.
- Market order lot filter: `marketMinQuantity`, `marketMaxQuantity`.
- Notional: `minNotional`, `maxNotional`.
- Price bands: `buyLimitUpRatio`, `sellLimitDownRatio`, `marketDeviationRatio`.
- Fees: `makerFee`, `takerFee` (ratios).
- `status`: `"TRADING"` or `"HALT"`.

Observed values for `vBTC_vUSDC` on mainnet:
- `tickSize "1"`, `pricePrecision 0`
- `stepSize "0.00001"`, `quantityPrecision 5`, `minQuantity "0.00001"`
- `minNotional "5"`
- `makerFee "0.00035"`, `takerFee "0.00065"`

For `vETH_vUSDC`: `tickSize "0.1"`, `stepSize "0.0001"`.

### OrderBook [doc: SCHEMA#orderbook; obs]
`{ blockTime: uint64 ms, blockHeight: uint64, updateID: uint64, bids: [price, qty][], asks: [price, qty][] }`. Each level is a 2-tuple of strings, aggregated per price level (L2).

[obs] Bids are sorted descending and asks ascending. Example best levels at 05:42:25Z: bid `["75576","0.03275"]`, ask `["75577","0.03118"]`. That is a spread of 1 tick.

### SpotTicker [doc: SCHEMA#spotticker; obs]
- `symbol`
- Prices and sizes (DecimalString): `lastPx`, `lastSz`, `openPx`, `highPx`, `lowPx`, `vwap`, `change`
- `changePct` (number)
- `volume` (base), `quoteVolume`
- Best bid/ask: `bidPx`, `bidSz`, `askPx`, `askSz`
- `openTime`, `closeTime` (ms)

[obs] `closeTime` equals the time of the last trade, not "now". On illiquid symbols the 24h window can be days old (e.g. `vSMH_vUSDC` closeTime was about 61 h before the server timestamp).

### BookTicker [doc]
`{symbol, bidPx, bidSz, askPx, askSz}`, all strings.

### MiniTicker [doc]
`{symbol, lastPx, openPx, highPx, lowPx, volume, quoteVolume, openTime, closeTime}`.

### Trade [doc: SCHEMA#trade; obs]
- `t` trade ID
- `T` time (ms)
- `s` symbol
- `p` price, `q` quantity (strings)
- `S` side, `"BUY"` or `"SELL"` (taker side presumably; the docs only say "Side")
- `bi` buyer account ID, `si` seller account ID (both optional)

[obs] Mainnet `vBTC_vUSDC` trades are mostly `q "0.00001"` about every 25 s between account IDs 1001 and 1002. This looks like market-maker or self-trade activity, but that is inference. Do not present it as organic flow.

### RPCKline [doc: SCHEMA#rpckline; obs]
- `t` open time (ms)
- `o`, `h`, `l`, `c` (strings)
- `v` base volume, `q` quote volume
- `n` number of trades

[obs] The newest candle comes first.

### SpotCoin [doc]
`{id, name, precision}`. [obs] `vUSDC` is id 0 with precision 6.

## 6. Rate limits [doc: RL]
- REST: **1200 weight per minute per IP**, fixed 1-minute window. Endpoints that are not listed cost 20.
- Kline extra weight: `max(1, floor(rows/25))`.
- [obs] The headers disagree with the docs. Responses carry `x-ratelimit-limit: 6000`, `x-ratelimit-remaining`, and `x-ratelimit-reset` (epoch seconds). Budget against the documented 1200 and read the headers.
- Polling cost: one order book at `limit≤100` costs 5. Polling one symbol every 1 s uses 300 of 1200 per minute, which is fine for a single server-side poller with a cache.
- WebSocket limits [doc]:
  - 10 concurrent connections per IP
  - 30 new connections per IP per minute
  - 1000 subscriptions per IP
  - 2000 messages per minute

## 7. WebSocket order-book channels (documented only; not connected)
Endpoint: `wss://{net}-gw.sodex.dev/ws/spot` [doc: `TA`/websocket-v1].

- **Keepalive**: the connection drops after 60 s without data. Send `{"op":"ping"}` and expect `{"op":"pong"}`.
- **L2 book** [doc: `TA`/websocket-v1/l2book]:
  - Subscribe with `{"op":"subscribe","params":{"channel":"l2Book","symbol":"WSOSO_vUSDC","tickSize":"0.0001"}}`.
  - Supported `tickSize` values are `symbol.tickSize × (1, 2, 5, 10, 100, 1000)` [doc: SCHEMA#wsl2booksubscriptionparams].
  - It streams the top **20** levels on each block, at most once every 0.5 s.
  - Message shape: `{channel:"l2Book", type:"snapshot", data:{s, u (updateID), E (ms), b:[[px,qty]], a:[[px,qty]]}}`.
- **L4 book** [doc: `TA`/websocket-v1/l4book]: a full-book snapshot, then per-order diffs on each block. Not needed for this app.
- Other public streams: ticker, miniTicker, bookTicker, candles, and market trades.

## 8. Matching rules (for Order Book Gym lessons) [doc]
- https://docs.sodex.com/trading-mechanics/orderbook:
  > "Orders must be precise: prices require **integer multiples of the tick size**, and sizes require **integer multiples of the lot size**. Matching strictly adheres to **price-time priority** (best price first, then earliest entry time)."
- Same page: "The SoDEX Order Book functions with the **identical mechanics of a centralized exchange**, but features **fully decentralized, on-chain execution**."
- https://docs.sodex.com/trading-mechanics/orders-types:
  - Market order: "execute a trade immediately at the best available price in the order book … executing as a Taker order. (Default slippage tolerance: 1%)".
  - Limit order: "at a specified limit price or better … Guarantees price but not fill."
  - IOC: "Any portion that cannot be filled instantly is canceled."
- Time in force [doc: SCHEMA#timeinforceenum]: `GTC`, `IOC`, `GTX` (Post Only: "Expires if the order would be filled immediately"), and `FOK` ("**not supported yet**").
- Maker and taker fees are per symbol (`makerFee` / `takerFee`) [doc + obs].

## 9. Data-quality notes for the adapter [obs]
- **Use mainnet for teaching books.** At capture, the testnet books were degenerate:
  - `vBTC_vUSDC` had a 3-level top, then gaps out to bids at `"1"` and asks at `"818491"`.
  - `vETH_vUSDC` had **zero asks**.
  - Testnet `vETH_vUSDC` trades returned `data: []`.
- The mainnet `vBTC_vUSDC` / `vETH_vUSDC` books had 20 levels per side, with the top 10 dense at 1-tick spacing.
- Latency: mostly 0.2–0.5 s, with one outlier at 3.7 s on the first `/markets/symbols` call (cold start). Use a timeout of 5 s or more and cache `/markets/symbols` (it rarely changes).
- Always check `code === 0` (errors arrive as HTTP 200) and check `status === "TRADING"` before showing a market.

## 10. Blockers
None for public reads. Mainnet and testnet both responded without auth or geo-block from this location. Do not rely on CORS from browsers; keep the calls server-side as planned.

## Fixtures (`lib/market-data/__fixtures__/sodex/`)
Each fixture has `_captured_at` (ISO) and `_source` (exact GET URL), plus the raw envelope. Long arrays are trimmed to ≤20 items; `_note` says where.

- `mainnet-spot-symbols.json`: 20 of 43 entries, with `vETH_vUSDC` appended.
- `testnet-spot-symbols.json`
- `mainnet-spot-orderbook-vBTC_vUSDC.json`
- `mainnet-spot-orderbook-vETH_vUSDC.json`
- `testnet-spot-orderbook-vBTC_vUSDC.json`
- `mainnet-spot-ticker-vBTC_vUSDC.json`
- `mainnet-spot-bookTickers.json`
- `mainnet-spot-trades-vBTC_vUSDC.json`
- `mainnet-spot-klines-1h-vBTC_vUSDC.json`
- `mainnet-error-symbol-not-found.json`
