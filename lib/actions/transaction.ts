"use server"
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Transaction } from "@/types/transaction";

export async function fetchTransactions(
  page: number,
  limit: number,
  search: string
): Promise<{ data: Transaction[]; total: number }> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabaseAdmin
    .from("transactions")
    .select(`
      id,
      pledge_id,
      user_id,
      payment_type,
      amount,
      currency,
      payment_method,
      payment_status,
      payment_ref,
      metadata,
      paid_at,
      created_at,
      updated_at,
      category,
      profiles:user_id (
        email,
        first_name,
        last_name
      )
    `, { count: "exact" });

  if (search) {
    query = query.or(`
      payment_ref.ilike.%${search}%,
      user_id.ilike.%${search}%,
      profiles.email.ilike.%${search}%,
      profiles.first_name.ilike.%${search}%,
      profiles.last_name.ilike.%${search}%
    `);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching transactions:", error);
    return { data: [], total: 0 };
  }

  const transformedData = (data || []).map((transaction: any) => ({
    ...transaction,
    user_email: transaction.profiles?.email,
    user_name: transaction.profiles ? 
      `${transaction.profiles.first_name || ""} ${transaction.profiles.last_name || ""}`.trim() :
      "Unknown",
    project_title: "N/A",
  }));

  return {
    data: transformedData,
    total: count || 0,
  };
}

export async function fetchTransactionById(id: string): Promise<Transaction | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc('fetch_transaction', {
      transaction_id: id,
    });

    if (error) {
      console.error('Error fetching transaction by ID:', error);
      return null;
    }

    // RPC functions always return an array
    if (!data || data.length === 0) return null;

    return data[0] as Transaction;
  } catch (err) {
    console.error('Unexpected error fetching transaction by ID:', err);
    return null;
  }
}
