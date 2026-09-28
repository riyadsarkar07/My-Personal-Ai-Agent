import assert from "node:assert/strict";
import { test } from "node:test";
import { authenticateUser, bootstrapPrimaryAdmin, isPlatformAdmin, registerUser } from "../lib/auth";
import { selectPrimaryAdminAuthUser } from "../lib/supabase/admin";
import { __resetMemoryStore, getProfileByEmail, getProfileById, seedDefaults } from "../lib/store";
import { roleForEmail } from "../lib/roles";

const originalAdminEmail = process.env.ADMIN_EMAIL;
const originalAdminUserId = process.env.ADMIN_USER_ID;

function restoreAdminEnv() {
  if (originalAdminEmail === undefined) delete process.env.ADMIN_EMAIL;
  else process.env.ADMIN_EMAIL = originalAdminEmail;
  if (originalAdminUserId === undefined) delete process.env.ADMIN_USER_ID;
  else process.env.ADMIN_USER_ID = originalAdminUserId;
}

test("password login still works for the local admin seed", async () => {
  restoreAdminEnv();
  delete process.env.ADMIN_EMAIL;
  __resetMemoryStore();
  const admin = await authenticateUser("admin@localhost", "ChangeMe123!");
  assert.ok(admin);
  assert.equal(admin.role, "owner");
  assert.equal(isPlatformAdmin(admin), true);
  assert.equal(await authenticateUser("admin@localhost", "wrong-password"), null);
  restoreAdminEnv();
});

test("signup creates members unless the email is ADMIN_EMAIL", async () => {
  restoreAdminEnv();
  delete process.env.ADMIN_EMAIL;
  __resetMemoryStore();
  const member = await registerUser({
    email: "member@example.com",
    password: "password12",
    fullName: "Regular User",
  });
  assert.equal(member.role, "member");
  assert.equal(isPlatformAdmin(member), false);
  assert.equal(roleForEmail("member@example.com", "admin@localhost"), "member");
  restoreAdminEnv();
});

test("bootstrap promotes the configured admin email to owner", async () => {
  restoreAdminEnv();
  delete process.env.ADMIN_EMAIL;
  __resetMemoryStore();
  await seedDefaults();
  const member = await registerUser({
    email: "promote-me@example.com",
    password: "password12",
    fullName: "Soon Owner",
  });
  assert.equal(member.role, "member");
  process.env.ADMIN_EMAIL = "promote-me@example.com";
  const promoted = await bootstrapPrimaryAdmin();
  assert.ok(promoted);
  assert.equal(promoted.email, "promote-me@example.com");
  assert.equal(promoted.role, "owner");
  const stored = await getProfileByEmail("promote-me@example.com");
  assert.equal(stored?.role, "owner");
  restoreAdminEnv();
});

test("regular users cannot become admin just by existing", async () => {
  process.env.ADMIN_EMAIL = "owner@example.com";
  __resetMemoryStore();
  await seedDefaults();
  const member = await registerUser({
    email: "member@example.com",
    password: "password12",
    fullName: "Regular User",
  });
  await bootstrapPrimaryAdmin();
  const stored = await getProfileById(member.id);
  assert.equal(stored?.role, "member");
  const owner = await getProfileByEmail("owner@example.com");
  assert.equal(owner?.role, "owner");
  restoreAdminEnv();
});

test("primary admin selection prefers id, then email, then the only auth user", () => {
  const users = [
    { id: "aaa", email: "one@example.com" },
    { id: "bbb", email: "admin@example.com" },
  ];
  assert.equal(selectPrimaryAdminAuthUser(users, "admin@example.com", "bbb")?.id, "bbb");
  assert.equal(selectPrimaryAdminAuthUser(users, "admin@example.com", "")?.email, "admin@example.com");
  assert.equal(selectPrimaryAdminAuthUser([{ id: "only", email: "solo@example.com" }], "other@example.com", "")?.id, "only");
  assert.equal(selectPrimaryAdminAuthUser(users, "missing@example.com", ""), null);
});
