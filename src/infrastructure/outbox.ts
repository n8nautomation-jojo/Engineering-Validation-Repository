import type { RequestContext } from "../application/context.js";

export interface OutboxEvent {
  readonly eventId:string;
  readonly eventType:string;
  readonly aggregateId:string;
  readonly aggregateVersion:number;
  readonly occurredAt:string;
  readonly tenantId:string;
  readonly organizationId:string;
  readonly branchId?:string;
  readonly deviceId?:string;
  readonly correlationId:string;
  readonly payload:unknown;
}

export interface OutboxStore {
  append(event:OutboxEvent, context:RequestContext):Promise<void>;
  getPending(limit:number):Promise<readonly OutboxEvent[]>;
  markDispatched(eventId:string):Promise<void>;
}
