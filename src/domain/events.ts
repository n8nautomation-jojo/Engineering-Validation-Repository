import type { AggregateVersion, DeviceId, ISODateTime, UUID } from "../kernel/types.js";

export interface DomainEvent<TPayload = unknown> {
  readonly eventId: UUID;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly aggregateId: UUID;
  readonly aggregateVersion: AggregateVersion;
  readonly occurredAt: ISODateTime;
  readonly deviceId?: DeviceId;
  readonly correlationId: UUID;
  readonly causationId?: UUID;
  readonly payload: TPayload;
}

export function assertDomainEventEnvelope(event: DomainEvent): void {
  if (!event.eventId || !event.eventType || event.eventVersion < 1) {
    throw new Error("INVALID_DOMAIN_EVENT_ENVELOPE");
  }
  if (!event.aggregateId || event.aggregateVersion < 0) {
    throw new Error("INVALID_DOMAIN_EVENT_AGGREGATE_METADATA");
  }
  if (!event.correlationId) {
    throw new Error("MISSING_CORRELATION_ID");
  }
}
