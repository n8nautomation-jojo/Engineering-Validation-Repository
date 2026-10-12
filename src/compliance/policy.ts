import type {
  EstablishmentLicence,
  MedicineRegulatoryProfile,
  ControlledDispensingRecord
} from "./types.js";

export interface DispensingValidationInput {
  readonly prescriptionReference?: string;
  readonly prescribingDoctorName?: string;
  readonly dispensingPharmacistRegistrationNo?: string;
  readonly patientNationalId?: string;
  readonly patientName?: string;
  readonly isBatchExpired: boolean;
}

export interface ComplianceDecision {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly enhancedAuditRequired: boolean;
}

export class CompliancePolicyEngine {
  /**
   * Validates pharmacy branch licence according to Sudan NMPB regulations.
   */
  public validateEstablishmentLicence(licence: EstablishmentLicence, now: string): { valid: boolean; reason?: string } {
    if (licence.status !== "ACTIVE") {
      return { valid: false, reason: `Pharmacy licence '${licence.licenceNumber}' is not active (${licence.status}).` };
    }
    const expiresMs = Date.parse(licence.expiresAt);
    const nowMs = Date.parse(now);
    if (Number.isFinite(expiresMs) && Number.isFinite(nowMs) && nowMs > expiresMs) {
      return { valid: false, reason: `Pharmacy licence '${licence.licenceNumber}' expired on ${licence.expiresAt}.` };
    }
    return { valid: true };
  }

  /**
   * Evaluates regulatory dispensing rules for medicines (NMPB 2009 & Narcotic Regulations 2022).
   */
  public validateMedicineDispensing(
    profile: MedicineRegulatoryProfile,
    input: DispensingValidationInput
  ): ComplianceDecision {
    // 1. Invariant: Expired medicine is strictly unsellable
    if (input.isBatchExpired) {
      return {
        allowed: false,
        reason: "EXPIRED_MEDICINE_DISPENSE_BLOCKED: Medicines with expired batch dates cannot be dispensed.",
        enhancedAuditRequired: true
      };
    }

    // 2. Controlled / Narcotic classification requirements
    if (profile.classification === "CONTROLLED_NARCOTIC") {
      if (!input.prescriptionReference || !input.dispensingPharmacistRegistrationNo) {
        return {
          allowed: false,
          reason: "CONTROLLED_SUBSTANCE_PRESCRIPTION_MANDATORY: Dispensing narcotics requires prescription reference and licensed pharmacist registration number.",
          enhancedAuditRequired: true
        };
      }
      if (!input.patientNationalId) {
        return {
          allowed: false,
          reason: "CONTROLLED_SUBSTANCE_PATIENT_ID_MANDATORY: Patient national ID is mandatory for narcotic dispensing.",
          enhancedAuditRequired: true
        };
      }
      return {
        allowed: true,
        enhancedAuditRequired: true // Enhanced audit trail mandatory for controlled drugs
      };
    }

    // 3. Prescription-Only Medicines (POM)
    if (profile.classification === "PRESCRIPTION_ONLY" && profile.requiresPrescription) {
      if (!input.prescriptionReference) {
        return {
          allowed: false,
          reason: "PRESCRIPTION_REQUIRED: Medicine is classified as POM and requires valid prescription.",
          enhancedAuditRequired: false
        };
      }
    }

    return {
      allowed: true,
      enhancedAuditRequired: false
    };
  }

  /**
   * Electronic Transactions Act 2007 (as amended 2015):
   * Financial, inventory, and audit records must not be destructively deleted.
   */
  public validateRecordPreservation(operation: string, entityType: string): { allowed: boolean; reason?: string } {
    if (operation.toUpperCase() === "DELETE" || operation.toUpperCase() === "PURGE") {
      const protectedEntities = ["SALE", "PAYMENT", "INVENTORY_TRANSACTION", "STOCK_MOVEMENT", "AUDIT_RECORD", "CONTROLLED_DISPENSING"];
      if (protectedEntities.includes(entityType.toUpperCase())) {
        return {
          allowed: false,
          reason: `ELECTRONIC_RECORDS_DELETION_PROHIBITED: Entity '${entityType}' cannot be deleted under Electronic Transactions Act evidence preservation requirements.`
        };
      }
    }
    return { allowed: true };
  }
}
