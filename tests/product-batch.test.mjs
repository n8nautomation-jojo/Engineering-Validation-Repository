import test from "node:test";
import assert from "node:assert/strict";
import { money } from "../dist/src/kernel/money.js";
import { quantity } from "../dist/src/kernel/quantity.js";
import { createProduct, archiveProduct } from "../dist/src/domain/product/product.js";
import { createBatch, activateBatch, markNearExpiry, markExpired, markDepleted } from "../dist/src/domain/inventory/batch.js";

test("product lifecycle is active then archived",()=>{const p=createProduct({id:"p1",organizationId:"o1",sku:"SKU-1",name:"Medicine"});assert.equal(p.status,"ACTIVE");assert.equal(archiveProduct(p).status,"ARCHIVED");});
test("batch lifecycle follows approved states",()=>{let b=createBatch({id:"b1",organizationId:"o1",warehouseId:"w1",productId:"p1",batchNumber:"B1",expiryDate:"2027-01-01",quantity:quantity(10)});b=activateBatch(b);b=markNearExpiry(b);b=markExpired(b);assert.equal(b.status,"EXPIRED");});
test("batch depletion requires zero quantity",()=>{let b=createBatch({id:"b2",organizationId:"o1",warehouseId:"w1",productId:"p1",batchNumber:"B2",expiryDate:"2027-01-01",quantity:quantity(0)});b=activateBatch(b);assert.equal(markDepleted(b).status,"DEPLETED");});
test("domain primitives remain valid for monetary inventory contexts",()=>{assert.deepEqual(money(12,"SDG"),{amount:12,currency:"SDG"});assert.equal(quantity(3).value,3);});
