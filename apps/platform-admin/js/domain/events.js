/**
 * [Feature / Domain]: Platform Administration — Domain Event Bus & Specifications
 * [Multi-Tenancy Context]: Decoupled Event-Driven Side-Effects
 * [Security / Entitlement]: Synchronous Isolation / Asynchronous Event Dispatch
 */

/**
 * Lightweight, in-memory domain event bus enforcing the Single Responsibility Principle.
 * Avoids executing side-effects (auditing, telemetry, alerts) synchronously inside domain logic.
 */
class DomainEventBus {
  constructor() {
    this._subscribers = new Map();
  }

  /**
   * Subscribe a listener to a specific domain event.
   *
   * @param {string} eventName - Qualified event identifier.
   * @param {(event: Object) => void} listener - Callback handler.
   * @returns {() => void} Unsubscribe function.
   */
  subscribe(eventName, listener) {
    if (!this._subscribers.has(eventName)) {
      this._subscribers.set(eventName, new Set());
    }
    this._subscribers.get(eventName).add(listener);

    return () => {
      this._subscribers.get(eventName)?.delete(listener);
    };
  }

  /**
   * Publish a domain event asynchronously to avoid blocking the main execution path.
   *
   * @param {string} eventName - Qualified event identifier.
   * @param {Object} payload - Immutable event payload.
   */
  publish(eventName, payload) {
    const listeners = this._subscribers.get(eventName);
    if (!listeners || listeners.size === 0) return;

    // PERF: Dispatch asynchronously in microtask to prevent blocking UI thread
    queueMicrotask(() => {
      listeners.forEach(fn => {
        try {
          fn(Object.freeze({ ...payload, eventName, emittedAt: new Date().toISOString() }));
        } catch (err) {
          // DEFENSIVE: One listener failure must never break other listeners
          console.error(`[EventBus] Handler failure on event ${eventName}:`, err);
        }
      });
    });
  }
}

export const eventBus = new DomainEventBus();

export const DomainEvents = Object.freeze({
  TENANT_PROVISIONED: 'tenant.provisioned.v1',
  TENANT_STATUS_CHANGED: 'tenant.status_changed.v1',
  CREDENTIALS_ROTATED: 'tenant.credentials_rotated.v1',
  TELEMETRY_REFRESHED: 'platform.telemetry_refreshed.v1'
});
