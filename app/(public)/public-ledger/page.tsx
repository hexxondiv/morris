import PublicLedgerClient from "./public-ledger-client";
import { getPublicLedgerData } from "@/lib/repositories/public-ledger-repository";

const INITIAL_LIMIT = 10;
export const dynamic = "force-dynamic";

export default async function PublicLedgerPage() {
  const initialData = await getPublicLedgerData(INITIAL_LIMIT, "all");
  return <PublicLedgerClient initialData={initialData} initialLimit={INITIAL_LIMIT} />;
}
