import type { BranchId, DeviceId, UUID } from "../../kernel/types.js";
import type { Money } from "../../kernel/money.js";

export type CashSessionStatus = "OPEN" | "CLOSED";
export type CashMovementType = "OPENING_FLOAT" | "CASH_IN" | "CASH_OUT";

export interface CashMovement {
  readonly id:UUID; readonly type:CashMovementType; readonly amount:Money; readonly occurredAt:string; readonly reason?:string;
}
export interface CashSession {
  readonly id:UUID; readonly branchId:BranchId; readonly deviceId:DeviceId; readonly cashRegisterId:UUID;
  readonly openedBy:string; readonly openedAt:string; readonly openingFloat:Money;
  readonly status:CashSessionStatus; readonly movements:readonly CashMovement[]; readonly version:number;
}
export function openCashSession(input:{id:UUID;branchId:BranchId;deviceId:DeviceId;cashRegisterId:UUID;openedBy:string;openedAt:string;openingFloat:Money}):CashSession {
  return Object.freeze({...input,status:"OPEN" as const,movements:[],version:0});
}
export function addCashMovement(session:CashSession,movement:CashMovement):CashSession {
  if(session.status!=="OPEN") throw new Error("CASH_SESSION_NOT_OPEN");
  if(movement.amount.currency!==session.openingFloat.currency) throw new Error("CURRENCY_MISMATCH");
  return Object.freeze({...session,movements:Object.freeze([...session.movements,movement]),version:session.version+1});
}
export function closeCashSession(session:CashSession,closedAt:string):CashSession {
  if(session.status!=="OPEN") throw new Error("CASH_SESSION_NOT_OPEN");
  return Object.freeze({...session,status:"CLOSED" as const,version:session.version+1});
}
