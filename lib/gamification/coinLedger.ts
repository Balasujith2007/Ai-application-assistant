import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

/**
 * Coins Ledger
 * ------------
 * Persistent, auditable coin accounting for students.
 *
 * Guarantees:
 * - Every credit/debit is recorded as an immutable CoinTransaction row.
 * - All writes happen inside a single database transaction (atomic).
 * - Idempotency is enforced through the unique `idempotencyKey` column, so a
 *   retried or duplicated request can never credit coins twice.
 * - Concurrent writes on the same student are serialised by Postgres row locks
 *   (balance is mutated with an atomic `increment`, never read-modify-write).
 */

export type CoinTransactionType =
  | 'REWARD_CREDIT'
  | 'ADMIN_ADJUSTMENT'
  | 'REWARD_DEBIT'
  | 'REFUND'
  | 'BONUS';

export interface CoinMutationInput {
  studentId: string;
  /** Signed amount. Positive credits, negative debits. Must be a non-zero integer. */
  amount: number;
  transactionType: CoinTransactionType;
  reason: string;
  referenceId?: string | null;
  idempotencyKey: string;
}

export interface CoinMutationResult {
  success: boolean;
  alreadyApplied: boolean;
  previousBalance: number;
  newBalance: number;
  amount: number;
}

type TxClient = Prisma.TransactionClient;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

async function ensureBalanceRow(tx: TxClient, studentId: string): Promise<void> {
  const existing = await tx.studentCoinBalance.findUnique({ where: { studentId } });
  if (existing) return;
  try {
    await tx.studentCoinBalance.create({ data: { studentId, balance: 0 } });
  } catch (error) {
    // A concurrent request may have created the row first — that is fine.
    if (!isUniqueViolation(error)) throw error;
  }
}

/**
 * Applies a coin mutation inside an existing transaction.
 * Use this when coins must be credited atomically together with other writes
 * (e.g. marking a reward as claimed).
 */
export async function applyCoinMutationInTx(
  tx: TxClient,
  input: CoinMutationInput
): Promise<CoinMutationResult> {
  const { studentId, amount, transactionType, reason, referenceId, idempotencyKey } = input;

  if (!Number.isInteger(amount) || amount === 0) {
    throw new Error('Coin amount must be a non-zero integer');
  }
  if (!idempotencyKey) {
    throw new Error('Coin mutation requires an idempotency key');
  }

  const existing = await tx.coinTransaction.findUnique({ where: { idempotencyKey } });
  if (existing) {
    return {
      success: true,
      alreadyApplied: true,
      previousBalance: existing.previousBalance,
      newBalance: existing.newBalance,
      amount: existing.amount,
    };
  }

  await ensureBalanceRow(tx, studentId);

  // Atomic increment — the returned value is the authoritative post-mutation balance.
  const updated = await tx.studentCoinBalance.update({
    where: { studentId },
    data: { balance: { increment: amount } },
  });

  const newBalance = updated.balance;
  const previousBalance = newBalance - amount;

  if (newBalance < 0) {
    // Rolls back the whole transaction (including the increment).
    throw new Error('INSUFFICIENT_COIN_BALANCE');
  }

  await tx.coinTransaction.create({
    data: {
      studentId,
      amount,
      transactionType,
      reason,
      referenceId: referenceId ?? null,
      idempotencyKey,
      previousBalance,
      newBalance,
    },
  });

  return {
    success: true,
    alreadyApplied: false,
    previousBalance,
    newBalance,
    amount,
  };
}

/**
 * Standalone coin mutation. Opens its own transaction and is safe to retry —
 * a duplicate `idempotencyKey` returns the original result instead of
 * crediting coins a second time.
 */
export async function applyCoinMutation(input: CoinMutationInput): Promise<CoinMutationResult> {
  try {
    return await prisma.$transaction((tx) => applyCoinMutationInTx(tx, input));
  } catch (error) {
    if (isUniqueViolation(error)) {
      const existing = await prisma.coinTransaction.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return {
          success: true,
          alreadyApplied: true,
          previousBalance: existing.previousBalance,
          newBalance: existing.newBalance,
          amount: existing.amount,
        };
      }
    }
    throw error;
  }
}

/** Reads the persisted coin balance for a student (0 when no ledger row exists yet). */
export async function getCoinBalance(studentId: string): Promise<number> {
  const row = await prisma.studentCoinBalance.findUnique({ where: { studentId } });
  return row?.balance ?? 0;
}

/** Returns the most recent coin transactions for a student. */
export async function getCoinHistory(studentId: string, take = 20) {
  return prisma.coinTransaction.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
    take,
  });
}

/**
 * Student-facing credit helper. Coins are always taken from the backend-allocated
 * reward amount — never from client input.
 */
export async function creditRewardCoins(input: {
  studentId: string;
  amount: number;
  reason: string;
  referenceId: string;
  idempotencyKey: string;
}): Promise<CoinMutationResult> {
  return applyCoinMutation({
    studentId: input.studentId,
    amount: input.amount,
    transactionType: 'REWARD_CREDIT',
    reason: input.reason,
    referenceId: input.referenceId,
    idempotencyKey: input.idempotencyKey,
  });
}

/** Admin-only manual balance adjustment (positive credit or negative debit). */
export async function adjustCoins(input: {
  studentId: string;
  amount: number;
  reason: string;
  adminId: string;
  idempotencyKey?: string;
}): Promise<CoinMutationResult> {
  return applyCoinMutation({
    studentId: input.studentId,
    amount: input.amount,
    transactionType: 'ADMIN_ADJUSTMENT',
    reason: input.reason,
    referenceId: input.adminId,
    idempotencyKey: input.idempotencyKey || `admin_${input.adminId}_${input.studentId}_${Date.now()}`,
  });
}

export const coinLedger = {
  applyCoinMutation,
  applyCoinMutationInTx,
  getCoinBalance,
  getCoinHistory,
  creditRewardCoins,
  adjustCoins,
};
