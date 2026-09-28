import assert from "node:assert/strict";
import { test } from "node:test";
import {
  __resetMemoryStore,
  createAgentRecord,
  createApiKeyRecord,
  createConversationRecord,
  createProjectRecord,
  getAgent,
  getConversation,
  listAgents,
  seedDefaults,
  upsertProfile,
} from "../lib/store";
import { generateApiKey, hashPassword } from "../lib/crypto";
import { nowIso } from "../lib/utils";

test("projects cannot read another project's agents or conversations", async () => {
  __resetMemoryStore();
  const ownerA = await upsertProfile({
    id: "usr_a",
    email: "a@example.com",
    full_name: "A",
    role: "owner",
    password_hash: hashPassword("password12"),
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  const ownerB = await upsertProfile({
    id: "usr_b",
    email: "b@example.com",
    full_name: "B",
    role: "owner",
    password_hash: hashPassword("password12"),
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  const projectA = await createProjectRecord({
    owner_id: ownerA.id,
    name: "A",
    description: "",
    rate_limit_rpm: 10,
    rate_limit_rpd: 100,
    max_tokens_per_request: 1024,
    status: "active",
    allowed_origins: [],
  });
  const projectB = await createProjectRecord({
    owner_id: ownerB.id,
    name: "B",
    description: "",
    rate_limit_rpm: 10,
    rate_limit_rpd: 100,
    max_tokens_per_request: 1024,
    status: "active",
    allowed_origins: [],
  });
  const agentA = await createAgentRecord({
    project_id: projectA.id,
    name: "Agent A",
    description: "",
    model: "gemini-2.0-flash",
    fallback_models: ["gpt-4o-mini"],
    system_instruction: "A",
    temperature: 0.2,
    max_tokens: 256,
    memory_enabled: true,
    tools_enabled: false,
    status: "active",
  });
  const convA = await createConversationRecord({
    project_id: projectA.id,
    agent_id: agentA.id,
    title: "Secret",
    metadata: {},
  });
  const agentsB = await listAgents(projectB.id);
  assert.equal(agentsB.length, 0);
  const leakedAgent = await getAgent(agentA.id);
  assert.equal(leakedAgent?.project_id === projectB.id, false);
  const conv = await getConversation(convA.id);
  assert.equal(conv?.project_id, projectA.id);
  assert.notEqual(conv?.project_id, projectB.id);
});

test("seedDefaults creates the first admin project and agent", async () => {
  __resetMemoryStore();
  await seedDefaults();
  await seedDefaults();
  const { listProjectsForUser, getProfileByEmail } = await import("../lib/store");
  const admin = await getProfileByEmail(process.env.ADMIN_EMAIL || "admin@localhost");
  assert.ok(admin);
  const projects = await listProjectsForUser(admin!.id);
  assert.ok(projects.length >= 1);
});

test("api key records store hashes not raw secrets", async () => {
  __resetMemoryStore();
  await seedDefaults();
  const { listProjectsForUser, getProfileByEmail, listApiKeys } = await import("../lib/store");
  const admin = await getProfileByEmail(process.env.ADMIN_EMAIL || "admin@localhost");
  const projects = await listProjectsForUser(admin!.id);
  const generated = generateApiKey();
  const record = await createApiKeyRecord({
    project_id: projects[0].id,
    name: "ci",
    raw: generated.raw,
    prefix: generated.prefix,
  });
  assert.equal(record.key_hash.includes(generated.raw), false);
  assert.notEqual(record.key_hash, generated.raw);
  const listed = await listApiKeys(projects[0].id);
  assert.equal(listed.some((k) => (k as { raw?: string }).raw), false);
});
