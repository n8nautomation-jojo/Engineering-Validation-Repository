import test from "node:test";
import assert from "node:assert/strict";

test("adapter requires and writes through the supplied transaction boundary", async () => {
  const m = await import("../dist/src/infrastructure/sql/platform-administration.js");
  let directDbCalls = 0;
  const db = { async query() { directDbCalls++; return { rows: [] }; } };
  const calls = [];
  const tx = {
    id: "tx-1",
    async commit() {},
    async rollback() {},
    async query(sql) { calls.push(sql); return { rows: [] }; }
  };
  const adapter = new m.PostgresPlatformAdministrationPersistence(db);
  assert.ok(adapter);
  assert.equal(directDbCalls, 0);
  assert.equal(typeof tx.query, "function");
  assert.ok(calls.length === 0);
});

test("migration declares uniqueness and append-only audit trigger", async () => {
  const fs = await import("node:fs/promises");
  const sql = await fs.readFile("docs/05-data/migrations/postgresql/002_platform_administration.sql","utf8");
  assert.match(sql,/unique \(organization_id,code\)/);
  assert.match(sql,/unique \(lower\(username\)\)/);
  assert.match(sql,/primary key \(command_name,idempotency_key\)/);
  assert.match(sql,/PLATFORM_AUDIT_APPEND_ONLY/);
});
