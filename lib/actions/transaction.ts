"use server";

import {
  getTransactionDetailById,
  listTransactionsForAdmin,
} from "@/lib/repositories/transaction-repository";
import type { Transaction } from "@/types/transaction";

export async function fetchTransactions(
  page: number,
  limit: number,
  search: string
): Promise<{ data: Transaction[]; total: number }> {
  const pageIndex = Math.max(0, page - 1);
  const { data, total } = await listTransactionsForAdmin({
    pageIndex,
    pageSize: limit,
    globalFilter: search,
    statusFilter: "",
    typeFilter: "",
    methodFilter: "",
    categoryFilter: "",
    dateFrom: null,
    dateTo: null,
    dateField: "created_at",
  });

  const transformedData = data.map((transaction) => ({
    ...transaction,
    user_email: transaction.profiles?.email,
    user_name: transaction.profiles
      ? `${transaction.profiles.first_name || ""} ${transaction.profiles.last_name || ""}`.trim()
      : "Unknown",
    project_title: transaction.project_title ?? "N/A",
  }));

  return {
    data: transformedData as unknown as Transaction[],
    total,
  };
}

export async function fetchTransactionById(
  id: string
): Promise<Transaction | null> {
  try {
    return (await getTransactionDetailById(id)) as Transaction | null;
  } catch (err) {
    console.error("Unexpected error fetching transaction by ID:", err);
    return null;
  }
}
