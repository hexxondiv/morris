import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { Role } from "@/types/database.types";
import { getUserRoleFromClerk } from "./actions";
import { isAuthorized } from "./utils";

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
};
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

// Admin Supabase client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

// Server-side Supabase client with Clerk auth integration
export async function supabaseServerClient(req: NextRequest) {
  try {
    const { getToken } = await auth();
    const token = await getToken({ template: "supabase" });

    return createClient(
      supabaseUrl!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        },
      }
    );
  } catch (error) {
    console.error("Error creating Supabase server client:", error);
    throw new Error("Failed to initialize Supabase server client");
  }
}

export async function ensureAuthorized(requiredRole: Role) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  const userRole = await getUserRoleFromClerk(userId);
  if (!userRole || !isAuthorized(userRole, requiredRole)) {
    redirect("/unauthorized");
  }
}

export async function cleanupOldPendingTransactions() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { error } = await supabaseAdmin
    .from("transactions")
    .delete()
    .eq("payment_status", "pending")
    .lt("created_at", thirtyDaysAgo.toISOString());

  if (error) console.error("Cleanup failed:", error);
  else console.log("Cleaned up old pending transactions");
}
