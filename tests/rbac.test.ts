import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ADMIN_EMAIL_DEFAULT,
  ADMIN_USER_ID_DEFAULT,
  isPlatformAdmin,
  isPlatformAdminIdentity,
  publicProfile,
  roleForIdentity,
} from "../lib/rbac";
import {
  __resetMemoryStore,
  createProjectRecord,
  listProjectsForUser,
  seedDefaults,
  upsertProfile,
  userCanAccessProject,
} from "../lib/store";
import { nowIso } from "../lib/utils";

test("designated UUID and email are platform admin", () => {
  assert.equal(isPlatformAdminIdentity(ADMIN_USER_ID_DEFAULT, "other@example.com"), true);
  assert.equal(isPlatformAdminIdentity("usr_other", ADMIN_EMAIL_DEFAULT), true);
  assert.equal(isPlatformAdminIdentity("usr_other", "member@example.com"), false);
  assert.equal(roleForIdentity(ADMIN_USER_ID_DEFAULT, ADMIN_EMAIL_DEFAULT), "owner");
  assert.equal(roleForIdentity("usr_other", "member@example.com", "member"), "member");
  assert.equal(roleForIdentity("usr_other", "member@example.com", "owner"), "member");
});

test("ordinary owners are not platform admins", () => {
  assert.equal(
    isPlatformAdmin({
      id: "usr_local",
      email: "someone@example.com",
      role: "owner",
    }),
    false,
  );
  const payload = publicProfile({
    id: ADMIN_USER_ID_DEFAULT,
    email: ADMIN_EMAIL_DEFAULT,
    full_name: "Admin",
    role: "owner",
    password_hash: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  assert.equal(payload.isAdmin, true);
});

test("platform admin can see every project; members stay isolated", async () => {
  __resetMemoryStore();
  const admin = await upsertProfile({
    id: ADMIN_USER_ID_DEFAULT,
    email: ADMIN_EMAIL_DEFAULT,
    full_name: "Admin",
    role: "owner",
    password_hash: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  const member = await upsertProfile({
    id: "usr_member",
    email: "member@example.com",
    full_name: "Member",
    role: "member",
    password_hash: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  const memberProject = await createProjectRecord({
    owner_id: member.id,
    name: "Member Project",
    description: "",
    rate_limit_rpm: 10,
    rate_limit_rpd: 100,
    max_tokens_per_request: 1024,
    status: "active",
    allowed_origins: [],
  });
  const adminProjects = await listProjectsForUser(admin.id);
  const memberProjects = await listProjectsForUser(member.id);
  assert.equal(adminProjects.some((p) => p.id === memberProject.id), true);
  assert.equal(memberProjects.every((p) => p.owner_id === member.id), true);
  assert.equal(await userCanAccessProject(admin.id, memberProject.id), true);
  assert.equal(await userCanAccessProject(member.id, memberProject.id), true);
});

test("seedDefaults still creates a local admin workspace without Supabase", async () => {
  __resetMemoryStore();
  await seedDefaults();
  const { getProfileByEmail, listProjectsForUser: list } = await import("../lib/store");
  const seeded = await getProfileByEmail(process.env.ADMIN_EMAIL || "admin@localhost");
  assert.ok(seeded);
  const projects = await list(seeded!.id);
  assert.ok(projects.length >= 1);
});
