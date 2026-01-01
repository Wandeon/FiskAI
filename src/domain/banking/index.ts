// src/domain/banking/index.ts
export {
  BankTransaction,
  TransactionDirection,
  MatchStatus,
  type BankTransactionProps,
} from "./BankTransaction"
export { BankingError } from "./BankingError"
export type { BankTransactionRepository } from "./BankTransactionRepository"
export { ImportDeduplicator, type DuplicateCheckResult } from "./ImportDeduplicator"
