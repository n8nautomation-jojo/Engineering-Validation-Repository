import test from "node:test";
import assert from "node:assert/strict";
import { createOfflineAllocation, consumeOfflineAllocation } from "../dist/src/domain/inventory/offline-allocation.js";

test("A1 runtime allocation consumes only within capacity",()=>{const a=createOfflineAllocation({id:"a1",branchId:"b1",warehouseId:"w1",deviceId:"d1",productId:"p1",allocatedCapacity:5});const n=consumeOfflineAllocation(a,5);assert.equal(n.state,"EXHAUSTED");assert.equal(n.consumedCapacity,5);});
test("A1 runtime rejects consumption after exhaustion",()=>{const a=createOfflineAllocation({id:"a1",branchId:"b1",warehouseId:"w1",deviceId:"d1",productId:"p1",allocatedCapacity:1});const n=consumeOfflineAllocation(a,1);assert.throws(()=>consumeOfflineAllocation(n,1));});
