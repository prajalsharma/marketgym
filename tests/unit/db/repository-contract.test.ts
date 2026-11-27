import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createLocalRepository } from "@/lib/db/local-repository";
import { runRepositoryContract } from "./repository-contract";

runRepositoryContract("LocalRepository", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "marketgym-contract-"));
  return { repo: createLocalRepository(path.join(dir, "store.json")), cleanup: () => rm(dir, { recursive: true, force: true }) };
});
