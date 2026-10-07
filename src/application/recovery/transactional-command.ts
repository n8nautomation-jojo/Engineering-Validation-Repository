import type { RequestContext } from "../context.js";
import { assertTrustedScope } from "../context.js";
import type { TransactionManager } from "../../persistence/contracts.js";

export interface RecoverySafeCommand<T> {
  readonly idempotencyKey:string;
  execute():Promise<T>;
}

export async function runTransactionalCommand<T>(
  context:RequestContext,
  transactions:TransactionManager,
  command:RecoverySafeCommand<T>
):Promise<T> {
  assertTrustedScope(context);
  const tx=await transactions.begin(context);
  try {
    const result=await command.execute();
    await tx.commit();
    return result;
  } catch(error) {
    await tx.rollback();
    throw error;
  }
}
