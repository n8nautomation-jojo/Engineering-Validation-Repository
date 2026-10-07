import type { OrganizationId, UUID } from "../../kernel/types.js";

export type ProductIntakeMode = "QUICK_ADD" | "INLINE_GOODS_RECEIPT" | "FULL_PROFILE";

export type ProductIntakeCommand = Readonly<{
  organizationId: OrganizationId;
  productId: UUID;
  name: string;
  sku?: string;
  barcode?: string;
  categoryId?: UUID;
  unitCode: string;
  mode: ProductIntakeMode;
  source: "USER" | "BULK_IMPORT" | "EXTERNAL" | "AI_ASSISTED";
  correlationId?: string;
}>;

export type ProductIntakeResult = Readonly<{
  productId: UUID;
  created: boolean;
  stockCreated: false;
}>;

export function validateProductIntake(command: ProductIntakeCommand): void {
  if (!command.organizationId || !command.productId) throw new Error("INVALID_PRODUCT_SCOPE");
  if (!command.name.trim() || !command.unitCode.trim()) throw new Error("INVALID_PRODUCT_IDENTITY");
  if (command.source === "AI_ASSISTED" && !command.correlationId) {
    throw new Error("AI_PROVENANCE_REQUIRED");
  }
}