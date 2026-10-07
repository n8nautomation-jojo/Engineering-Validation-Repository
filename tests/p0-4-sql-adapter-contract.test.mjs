import test from "node:test";
import assert from "node:assert/strict";
const m=await import("../dist/src/infrastructure/sql/conflict-resolution-unit-of-work.js");
test("PostgreSQL dialect is positional and JSON compatible",()=>{assert.equal(m.postgresConflictDialect.placeholder(3),"$3");assert.equal(m.postgresConflictDialect.json(["a"]),"[\"a\"]");});
test("SQLite dialect is positional and JSON compatible",()=>{assert.equal(m.sqliteConflictDialect.placeholder(3),"?");assert.equal(m.sqliteConflictDialect.json(["a"]),"[\"a\"]");});
