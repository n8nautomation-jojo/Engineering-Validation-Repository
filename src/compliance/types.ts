import type { TenantId, OrganizationId, BranchId, UserId, UUID } from "../kernel/identifiers.js";

export type ProductId = UUID;

export type RegulatoryClassification =
  | "STANDARD"
  | "PRESCRIPTION_ONLY"
  | "CONTROLLED_NARCOTIC"
  | "REFRIGERATED_COLD_CHAIN";

export type EstablishmentType = "COMMUNITY_PHARMACY" | "HOSPITAL_PHARMACY" | "WHOLESALER";
export type LicenceStatus = "ACTIVE" | "EXPIRED" | "SUSPENDED";

export interface EstablishmentLicence {
  readonly licenceNumber: string;
  readonly establishmentType: EstablishmentType;
  readonly issuingAuthority: string; // e.g., "Sudan National Medicines and Poisons Board (NMPB)"
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly supervisingPharmacistName: string;
  readonly supervisingPharmacistRegistrationNo: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly status: LicenceStatus;
}

export interface ControlledDispensingRecord {
  readonly recordId: string;
  readonly saleId: string;
  readonly productId: ProductId;
  readonly batchNumber: string;
  readonly quantity: number;
  readonly patientNationalId: string;
  readonly patientName: string;
  readonly prescriptionReference: string;
  readonly prescribingDoctorName: string;
  readonly dispensingPharmacistRegistrationNo: string;
  readonly dispensedAt: string;
  readonly branchId: BranchId;
  readonly dispensingUserId: UserId;
}

export interface MedicineRegulatoryProfile {
  readonly productId: ProductId;
  readonly tradeName: string;
  readonly genericName: string;
  readonly nmpbRegistrationNumber?: string;
  readonly classification: RegulatoryClassification;
  readonly requiresPrescription: boolean;
  readonly manufacturer: string;
  readonly storageConditions?: string;
  readonly isColdChain: boolean;
}
