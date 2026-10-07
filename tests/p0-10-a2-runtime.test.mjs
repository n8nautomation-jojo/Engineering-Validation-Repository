import test from "node:test";
import assert from "node:assert/strict";
import { detectConflict, classifyConflict, triageConflict, beginResolution, resolveConflict, containConflict } from "../dist/src/domain/sync/conflict.js";

const base={operationId:"op-1",type:"STOCK_SHORTFALL",severity:"P0",originalEffectIds:["sale-1"],resultingEffectIds:[],createdAt:"2026-10-07T01:00:00Z"};
test("A2 lifecycle is explicit and original effects remain unchanged",()=>{let c=detectConflict({id:"c-1",...base});c=classifyConflict(c);c=triageConflict(c);c=beginResolution(c,"R-HUMAN");c=resolveConflict(c,["resolution-1"]);assert.equal(c.state,"RESOLVED");assert.deepEqual(c.originalEffectIds,["sale-1"]);assert.deepEqual(c.resultingEffectIds,["resolution-1"]);});
test("A2 containment is explicit",()=>{let c=detectConflict({id:"c-2",...base});c=classifyConflict(c);c=containConflict(c);assert.equal(c.state,"CONTAINED");});
test("A2 invalid transition is rejected",()=>{const c=detectConflict({id:"c-3",...base});assert.throws(()=>resolveConflict(c,["x"]),/INVALID_CONFLICT_TRANSITION/);});
