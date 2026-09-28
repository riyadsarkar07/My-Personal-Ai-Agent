import assert from "node:assert/strict";
import { test } from "node:test";
import {
  __resetMemoryStore,
  createProjectRecord,
  listMemories,
  retrieveMemories,
  upsertMemory,
  upsertProfile,
} from "../lib/store";
import { hashPassword } from "../lib/crypto";
import { nowIso } from "../lib/utils";

test("memories never leak across projects", async () => {
  __resetMemoryStore();
  const ownerA = await upsertProfile({
    id: "usr_ma",
    email: "ma@example.com",
    full_name: "A",
    role: "owner",
    password_hash: hashPassword("password12"),
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  const ownerB = await upsertProfile({
    id: "usr_mb",
    email: "mb@example.com",
    full_name: "B",
    role: "owner",
    password_hash: hashPassword("password12"),
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  const projectA = await createProjectRecord({
    owner_id: ownerA.id,
    name: "Mem A",
    description: "",
    rate_limit_rpm: 10,
    rate_limit_rpd: 100,
    max_tokens_per_request: 1024,
    status: "active",
    allowed_origins: [],
  });
  const projectB = await createProjectRecord({
    owner_id: ownerB.id,
    name: "Mem B",
    description: "",
    rate_limit_rpm: 10,
    rate_limit_rpd: 100,
    max_tokens_per_request: 1024,
    status: "active",
    allowed_origins: [],
  });
  await upsertMemory({
    project_id: projectA.id,
    key: "secret",
    content: "project A only",
  });
  const leaked = await listMemories(projectB.id);
  assert.equal(leaked.length, 0);
  const found = await retrieveMemories(projectA.id, null, "secret");
  assert.equal(found[0]?.content, "project A only");
  const missed = await retrieveMemories(projectB.id, null, "secret");
  assert.equal(missed.length, 0);
});
