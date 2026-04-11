"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { signInWithGoogle } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, setIsPending] = useState(false);
  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") || "/dashboard",
    [searchParams]
  );

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [callbackUrl, router, status]);

  return (
    <div className="flex justify-center px-4 py-24">
      <Card className="w-full max-w-md border-theme-100 shadow-sm">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-2xl font-semibold text-theme-900">
            Sign in
          </CardTitle>
          <p className="text-sm text-stone-600">
            Continue with your Google account to access your MORRIS MONYE dashboard.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full bg-theme-500 text-white hover:bg-theme-600"
            disabled={isPending || status === "loading"}
            onClick={async () => {
              setIsPending(true);
              try {
                await signInWithGoogle(callbackUrl);
              } finally {
                setIsPending(false);
              }
            }}
          >
            {isPending || status === "loading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting
              </>
            ) : (
              "Continue with Google"
            )}
          </Button>
          <p className="text-center text-xs text-stone-500">
            Bootstrap super admin access links automatically when the Google email
            matches the seeded email exactly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
