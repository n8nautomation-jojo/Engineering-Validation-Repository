import type { RequestContext } from "../application/context.js";
import type {
  AuditRecord,
  AuditStore,
  IdempotencyRecord,
  IdempotencyStore,
  Transaction,
  TransactionManager,
  VersionedRecord,
  VersionedRepository
} from "./contracts.js";

export class InMemoryTransaction implements Transaction {
  public committed = false;
  public rolledBack = false;

  constructor(public readonly id: string) {}

  async commit(): Promise<void> {
    if (this.rolledBack) throw new Error("TRANSACTION_ALREADY_ROLLED_BACK");
    this.committed = true;
  }

  async rollback(): Promise<void> {
    if (this.committed) throw new Error("TRANSACTION_ALREADY_COMMITTED");
    this.rolledBack = true;
  }
}

export class InMemoryTransactionManager implements TransactionManager {
  private counter = 0;
  public readonly transactions: InMemoryTransaction[] = [];

  async begin(_context: RequestContext): Promise<Transaction> {
    const tx = new InMemoryTransaction(`test-tx-${++this.counter}`);
    this.transactions.push(tx);
    return tx;
  }
}

export class InMemoryVersionedRepository<T extends VersionedRecord>
  implements VersionedRepository<T> {
  private readonly records = new Map<string, T>();

  async get(id: string): Promise<T | null> {
    return this.records.get(id) ?? null;
  }

  async insert(record: T): Promise<void> {
    if (this.records.has(record.id)) throw new Error("DUPLICATE_RECORD");
    this.records.set(record.id, record);
  }

  async update(record: T, expectedVersion: number): Promise<void> {
    const current = this.records.get(record.id);
    if (!current) throw new Error("RECORD_NOT_FOUND");
    if (current.version !== expectedVersion) throw new Error("STALE_VERSION");
    this.records.set(record.id, record);
  }
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();

  async find(key: string, commandName: string): Promise<IdempotencyRecord | null> {
    return this.records.get(`${commandName}:${key}`) ?? null;
  }

  async put(record: IdempotencyRecord): Promise<void> {
    const composite = `${record.commandName}:${record.key}`;
    if (this.records.has(composite)) throw new Error("DUPLICATE_IDEMPOTENCY_KEY");
    this.records.set(composite, record);
  }
}

export class InMemoryAuditStore implements AuditStore {
  public readonly records: AuditRecord[] = [];

  async append(record: AuditRecord): Promise<void> {
    this.records.push(Object.freeze({ ...record }));
  }
}
