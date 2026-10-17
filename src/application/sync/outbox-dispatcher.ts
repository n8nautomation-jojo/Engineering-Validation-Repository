/**
 * PharmaTech — Application Outbox Event Dispatcher
 * Coordinates reliable, sequential (FIFO) dispatch of Outbox events to remote transport.
 * Adheres to Clean Architecture: Decoupled from transport, database, and presentation layers.
 */

import type { OutboxEvent, OutboxStore } from "../../infrastructure/outbox.js";
import type { AuditStore } from "../../persistence/contracts.js";

export interface TransportDeliveryResult {
  readonly success: boolean;
  readonly status: number;
  readonly error?: string;
  readonly retryable: boolean;
}

export interface EventTransport {
  deliver(event: OutboxEvent): Promise<TransportDeliveryResult>;
}

export interface DispatchSummary {
  readonly processed: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly stoppedDueToRetryableError: boolean;
}

export class OutboxDispatcher {
  constructor(
    private readonly outboxStore: OutboxStore,
    private readonly transport: EventTransport,
    private readonly auditStore?: AuditStore
  ) {}

  /**
   * Dispatches pending events sequentially to guarantee strict causal/FIFO ordering.
   * If a retryable network error occurs, execution halts immediately for that batch
   * to prevent out-of-order event delivery at the destination.
   */
  async dispatchPending(limit = 50): Promise<DispatchSummary> {
    const pendingEvents = await this.outboxStore.getPending(limit);

    let succeeded = 0;
    let failed = 0;
    let stoppedDueToRetryableError = false;

    for (const event of pendingEvents) {
      try {
        const result = await this.transport.deliver(event);

        if (result.success) {
          await this.outboxStore.markDispatched(event.eventId);
          succeeded++;

          if (this.auditStore) {
            await this.auditStore.append({
              id: `aud-sync-${Date.now()}-${event.eventId.slice(0, 8)}`,
              occurredAt: new Date().toISOString(),
              actorId: "system-sync-dispatcher",
              action: "OUTBOX_EVENT_DISPATCHED",
              resourceType: "OutboxEvent",
              resourceId: event.eventId,
              tenantId: event.tenantId,
              organizationId: event.organizationId,
              ...(event.branchId ? { branchId: event.branchId } : {}),
              ...(event.deviceId ? { deviceId: event.deviceId } : {}),
              correlationId: event.correlationId,
              reason: `Dispatched ${event.eventType} for aggregate ${event.aggregateId}`
            });
          }
        } else {
          failed++;
          if (result.retryable) {
            // STOP immediately to protect strict causal ordering
            stoppedDueToRetryableError = true;
            break;
          } else {
            // Non-retryable error (e.g. malformed schema / poison message)
            if (this.outboxStore.markFailed) {
              await this.outboxStore.markFailed(event.eventId, result.error || "NON_RETRYABLE_ERROR");
            }
          }
        }
      } catch (transportError: any) {
        failed++;
        stoppedDueToRetryableError = true;
        break;
      }
    }

    return {
      processed: succeeded + failed,
      succeeded,
      failed,
      stoppedDueToRetryableError
    };
  }
}
