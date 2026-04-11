"use client";

import { Suspense } from "react";
import {
  useState,
  useEffect,
  useTransition,
  useMemo,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  CreditCard,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { pledgeSchema, projectSchema, ProjectSchema } from "@/lib/zod-schema";
import { toast } from "sonner";
import useSwitchAppCheckout from "@/lib/switchapp";
import LogoLoader from "@/components/components/logo-loader";
import { Checkbox } from "@/components/ui/checkbox";
import { useCurrentUser } from "@/lib/auth-client";

type PledgeFormValues = z.infer<typeof pledgeSchema>;

// Quick amount options
const QUICK_AMOUNTS = [
  5000, 10000, 20000, 50000, 100000, 500000, 1000000, 10000000,
];

// Styled radio option component
const RadioOption = ({
  value,
  currentValue,
  children,
  disabled = false,
  id,
  className = "",
}: {
  value: string;
  currentValue: string | undefined;
  children: React.ReactNode;
  disabled?: boolean;
  id: string;
  className?: string;
}) => (
  <div className={className}>
    <RadioGroupItem
      value={value}
      id={id}
      className="peer sr-only"
      disabled={disabled}
    />
    <label
      htmlFor={id}
      className={`
        flex items-center justify-center rounded-xl border-2 p-3 text-sm font-medium cursor-pointer transition-all duration-200
        peer-disabled:cursor-not-allowed peer-disabled:opacity-50
        ${
          currentValue === value
            ? "border-theme-500 bg-theme-50 text-theme-700 shadow-sm dark:bg-theme-950 dark:text-theme-300"
            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800"
        }
      `}
    >
      {children}
    </label>
  </div>
);

// Loading component
function PledgePageLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center space-y-4">
        <LogoLoader />
      </div>
    </main>
  );
}

// Main pledge content component
function GeneralPledgeContent() {
  const [isPending, startTransition] = useTransition();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [project, setProject] = useState<
    (ProjectSchema & { id: string }) | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<PledgeFormValues | null>(null);
  const { initiateCheckout, isClientReady } = useSwitchAppCheckout();
  const user = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  // TODO: Get value from settings
  const minContributionAmount = 500;

  // Parse project slug from URL parameters
  const projectSlug = useMemo(() => {
    const p = searchParams.get("p");
    return p ? JSON.parse(atob(p))?.slug : null;
  }, [searchParams]);

  const isGeneral = !projectSlug;

  const form = useForm<PledgeFormValues>({
    resolver: zodResolver(pledgeSchema),
    defaultValues: {
      amount: undefined,
      pledgeType: "one_time",
      recurrenceInterval: undefined,
      paymentDay: undefined,
    },
  });

  // Calculate project progress
  const projectProgress = useMemo(() => {
    if (!project || isGeneral) return null;

    const goal = project.goal_amount ?? 0;
    const raised = project.current_amount ?? 0;
    const remaining = Math.max(0, goal - raised);
    const percentage = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;

    return {
      goal,
      raised,
      remaining,
      percentage,
      isGoalReached: remaining <= 0,
    };
  }, [project, isGeneral]);

  // Fetch project details
  const fetchProject = useCallback(async () => {
    if (isGeneral || !projectSlug) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectSlug}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load project");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const result = projectSchema.safeParse(data.project);
      if (!result.success) {
        console.error("Project data validation error:", result.error);
        throw new Error("Invalid project data");
      }

      setProject({
        ...result.data,
        id: data.project.id,
        cover_image: data.project.cover_image ?? undefined,
      });
    } catch (err) {
      console.error("Error fetching project:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Project not found";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [projectSlug, isGeneral]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const onSubmit = async (data: PledgeFormValues) => {
    if (!user) {
      toast.error("Please sign in to create a pledge.");
      return;
    }

    setFormData(data);
    setIsConfirmOpen(true);
  };

  const handleConfirmPledge = useCallback(() => {
    if (!user || !formData || !isClientReady) {
      toast.error("Invalid data or payment client not ready");
      setIsConfirmOpen(false);
      return;
    }

    startTransition(async () => {
      try {
        // Create pledge
        const pledgeResponse = await fetch("/api/pledges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: formData.amount,
            pledgeType: formData.pledgeType,
            recurrenceInterval: formData.recurrenceInterval,
            paymentDay: formData.paymentDay,
            anonymous: formData.anonymous,
            projectId: project?.id,
          }),
        });

        const pledgeResult = await pledgeResponse.json();
        if (!pledgeResponse.ok) {
          throw new Error(pledgeResult.error || "Failed to create pledge");
        }

        // Create transaction
        const transactionResponse = await fetch("/api/transactions/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: formData.amount,
            pledgeId: pledgeResult.pledgeId,
            paymentType: "pledge",
            projectId: project?.id,
            currency: "NGN",
          }),
        });

        const transactionResult = await transactionResponse.json();
        if (!transactionResponse.ok) {
          throw new Error(
            transactionResult.error || "Failed to create transaction"
          );
        }

        // Initiate checkout
        await initiateCheckout({
          form,
          user,
          project,
          txRef: transactionResult.txRef,
          pledgeId: pledgeResult.pledgeId,
          paymentType: "pledge",
          router,
        });
      } catch (err: any) {
        console.error("Pledge or transaction creation failed:", err);
        toast.error(err.message || "Failed to process. Please try again.");
      } finally {
        setIsConfirmOpen(false);
        setFormData(null);
      }
    });
  }, [user, formData, isClientReady, initiateCheckout, form, project, router]);

  const handleGoBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <LogoLoader />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 z-50 w-full h-1 bg-gray-200 dark:bg-gray-700">
        <div
          className="h-1 bg-theme-500 transition-all duration-700 ease-out"
          style={{ width: "60%" }}
        />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="h-10 w-10 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isGeneral ? "General donation" : project?.title || "Project"}
            </p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Make a Contribution
            </h1>
          </div>
        </div>

        {/* Project progress (if not general) */}
        {projectProgress && !isGeneral && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Progress
              </span>
              <span className="text-sm font-semibold text-theme-600 dark:text-theme-400">
                {projectProgress.percentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
              <div
                className="bg-theme-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${projectProgress.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Raised: <strong>{formatCurrency(projectProgress.raised)}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                Goal: <strong>{formatCurrency(projectProgress.goal)}</strong>
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <p className="text-red-700 dark:text-red-400 text-center">
              {error}
            </p>
          </div>
        )}

        {/* Main form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Amount input */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Contribution Amount
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-xl font-semibold text-gray-600 dark:text-gray-400">
                          ₦
                        </span>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          className="pl-10 pr-4 py-3 text-lg font-medium rounded-xl border-2 focus:border-theme-500 focus:ring-2 focus:ring-theme-100 dark:focus:ring-theme-900"
                          min={minContributionAmount}
                          autoFocus
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            // If empty string, set to undefined for form validation; otherwise convert to number
                            field.onChange(
                              value === "" ? undefined : Number(value)
                            );
                          }}
                          disabled={isPending}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quick amount selection */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quick select
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {QUICK_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => form.setValue("amount", amount)}
                      disabled={isPending}
                      className={`
                        px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all duration-200
                        ${
                          form.watch("amount") === amount
                            ? "border-theme-500 bg-theme-50 text-theme-700 dark:bg-theme-950 dark:text-theme-300"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                        }
                      `}
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pledge type */}
              {/* <FormField
                control={form.control}
                name="pledgeType"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Pledge Type
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-2 gap-4"
                      >
                        <RadioOption
                          value="one_time"
                          currentValue={field.value}
                          id="pledge-type-one_time"
                          disabled={isPending}
                        >
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            One-time
                          </div>
                        </RadioOption>
                        <RadioOption
                          value="recurring"
                          currentValue={field.value}
                          id="pledge-type-recurring"
                          disabled={isPending}
                        >
                          <div className="flex items-center gap-2">
                            <Heart className="h-4 w-4" />
                            Recurring
                          </div>
                        </RadioOption>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}

              {/* Recurring options */}
              {form.watch("pledgeType") === "recurring" && (
                <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                  <FormField
                    control={form.control}
                    name="recurrenceInterval"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <FormLabel className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          How often?
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-3 gap-3"
                          >
                            {["monthly", "quarterly", "yearly"].map(
                              (interval) => (
                                <RadioOption
                                  key={interval}
                                  value={interval}
                                  currentValue={field.value}
                                  id={`interval-${interval}`}
                                  disabled={isPending}
                                >
                                  {interval.charAt(0).toUpperCase() +
                                    interval.slice(1)}
                                </RadioOption>
                              )
                            )}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentDay"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <FormLabel className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          Payment day
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-3 gap-3"
                          >
                            {["today", "1st", "28th"].map((day) => (
                              <RadioOption
                                key={day}
                                value={day}
                                currentValue={field.value}
                                id={`day-${day}`}
                                disabled={isPending}
                              >
                                {day.charAt(0).toUpperCase() + day.slice(1)}
                              </RadioOption>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Anonymous donation option */}
              <FormField
                control={form.control}
                name="anonymous"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          disabled={isPending}
                          className="data-[state=checked]:bg-theme-500 data-[state=checked]:border-theme-500"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-base font-medium text-gray-900 dark:text-gray-100 cursor-pointer">
                          Make this donation anonymous
                        </FormLabel>
                        <FormDescription className="text-sm text-gray-600 dark:text-gray-400">
                          Your name will not be displayed publicly with this contribution
                        </FormDescription>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-theme-500 hover:bg-theme-600 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Continue to Payment
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-theme-100 dark:bg-theme-900 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-theme-600 dark:text-theme-400" />
            </div>
            <DialogTitle className="text-xl">
              Confirm Your Contribution
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              You'll be charged{" "}
              <strong className="text-theme-600 dark:text-theme-400">
                {formatCurrency(form.watch("amount"))}
              </strong>{" "}
              {form.watch("pledgeType") === "recurring"
                ? `every ${form.watch("recurrenceInterval")} on the ${
                    form.watch("paymentDay") || "1st"
                  }`
                : ""}
              {!isGeneral
                ? ` for "${project?.title || "this project"}".`
                : " as a general donation."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmOpen(false);
                setFormData(null);
              }}
              disabled={isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPledge}
              className="flex-1 bg-theme-500 hover:bg-theme-600 text-white"
              disabled={isPending || !isClientReady}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Confirm Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

// Main export with Suspense wrapper
export default function GeneralPledgePage() {
  return (
    <Suspense fallback={<PledgePageLoading />}>
      <GeneralPledgeContent />
    </Suspense>
  );
}
