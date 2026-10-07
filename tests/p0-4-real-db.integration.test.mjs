import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Client } from "pg";
import { DatabaseSync } from "node:sqlite";
import { SqlConflictResolutionUnitOfWork, postgresConflictDialect, sqliteConflictDialect } from "../dist/src/infrastructure/sql/conflict-resolution-unit-of-work.js";

const migration = fs.readFileSync(new URL("../docs/05-data/migrations/postgresql/001_p0_4_foundation.sql", import.meta.url), "utf8");
const sqliteMigration = fs.readFileSync(new URL("../docs/05-data/migrations/sqlite/001_p0_4_foundation.sql", import.meta.url), "utf8");

function record(id="c1") {
  return {
    conflict: {
      id, operationId:"op-1", type:"STOCK_SHORTFALL", severity:"P0",
      state:"RESOLVED", resolutionClass:"R-HUMAN", originalEffectIds:["e1"],
      resultingEffectIds:["e2"], createdAt:new Date().toISOString(), version:2
    },
    requestFingerprint:"fp-1", resolvedAt:new Date().toISOString()
  };
}

function audit(id="a1") {
  return {
    id, occurredAt:new Date().toISOString(), actorId:"u1",
    action:"SYNC_CONFLICT_RESOLVED", resourceType:"SyncConflict", resourceId:"c1",
    tenantId:"t1", organizationId:"o1", branchId:"b1", deviceId:"d1",
    correlationId:"op-1", reason:"test", before:{state:"TRIAGED"}, after:{state:"RESOLVED"}
  };
}

function sqliteConnection(db) {
  return {
    async beginTransaction() {
      db.exec("BEGIN");
      return {
        async query(sql, params=[]) {
          const stmt=db.prepare(sql);
          const rows=stmt.all(...params);
          return {rows, rowCount:rows.length};
        },
        async commit(){db.exec("COMMIT");},
        async rollback(){db.exec("ROLLBACK");}
      };
    }
  };
}

const shouldRunPostgres = Boolean(process.env.DATABASE_URL);
test("PostgreSQL real engine: commit and rollback are durable", { skip: !shouldRunPostgres }, async (t) => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  t.after(async () => client.end());
  await client.query(migration);
  const connection = {
    async beginTransaction() {
      await client.query("BEGIN");
      return {
        async query(sql, params = []) {
          const r = await client.query(sql, params);
          return { rows: r.rows, rowCount: r.rowCount };
        },
        async commit() { await client.query("COMMIT"); },
        async rollback() { await client.query("ROLLBACK"); }
      };
    }
  };
  const uow = new SqlConflictResolutionUnitOfWork(connection, postgresConflictDialect);
  await uow.execute(/** @type {any} */ ({}), async p => {
    await p.insertConflict(record("pg1"));
    await p.appendAudit(audit("pa1"));
  });
  const committed = await client.query("SELECT count(*)::int AS n FROM sync_conflicts WHERE id=$1", ["pg1"]);
  assert.equal(committed.rows[0].n, 1);
  await assert.rejects(() => uow.execute(/** @type {any} */ ({}), async p => {
    await p.updateConflict("missing", record("missing"));
  }));
  const rolled = await client.query("SELECT count(*)::int AS n FROM sync_conflicts WHERE id=$1", ["missing"]);
  assert.equal(rolled.rows[0].n, 0);
});

test("SQLite real engine: commit and rollback are durable", async () => {
  const db=new DatabaseSync(":memory:");
  db.exec(sqliteMigration);
  const uow=new SqlConflictResolutionUnitOfWork(sqliteConnection(db),sqliteConflictDialect);
  await uow.execute(/** @type {any} */ ({}), async p => { await p.insertConflict(record()); await p.appendAudit(audit()); return true; });
  const check=db.prepare("SELECT count(*) AS n FROM sync_conflicts").get();
  assert.equal(Number(check.n),1);
  await assert.rejects(()=>uow.execute(/** @type {any} */ ({}), async p => { await p.updateConflict("missing",record("missing")); }));
  const after=db.prepare("SELECT count(*) AS n FROM sync_conflicts").get();
  assert.equal(Number(after.n),1);
  db.close();
});
