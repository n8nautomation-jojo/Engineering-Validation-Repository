import type { OrganizationId, UUID } from "../../kernel/types.js";

export type ProductStatus = "ACTIVE" | "ARCHIVED";

export interface Product {
  readonly id: UUID;
  readonly organizationId: OrganizationId;
  readonly sku: string;
  readonly name: string;
  readonly status: ProductStatus;
  readonly version: number;
}

export function createProduct(input:{id:UUID;organizationId:OrganizationId;sku:string;name:string}):Product {
  if (!input.sku.trim() || !input.name.trim()) throw new Error("INVALID_PRODUCT_IDENTITY");
  return Object.freeze({...input,status:"ACTIVE" as const,version:0});
}

export function archiveProduct(product:Product):Product {
  return Object.freeze({...product,status:"ARCHIVED" as const,version:product.version+1});
}
