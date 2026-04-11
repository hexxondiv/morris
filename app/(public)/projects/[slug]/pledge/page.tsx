"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { projectSchema, ProjectSchema } from "@/lib/zod-schema";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { toNaira } from "@/lib/utils";

const pledgeFormSchema = z
  .object({
    amount: z
      .number()
      .positive("Please enter a positive amount")
      .min(5, "Minimum pledge is ₦5"),
    pledgeType: z.enum(["one_time", "recurring"]),
    recurrenceInterval: z.enum(["monthly", "quarterly", "yearly"]).optional(),
    paymentDay: z.enum(["today", "1st", "28th"]).optional(),
  })
  .refine(
    (data) =>
      (data.pledgeType === "recurring" &&
        data.recurrenceInterval != null &&
        data.paymentDay != null) ||
      (data.pledgeType === "one_time" &&
        data.recurrenceInterval == null &&
        data.paymentDay == null),
    {
      message:
        "Recurring pledges require an interval and payment day; one-time pledges must not have them",
      path: ["recurrenceInterval"],
    }
  );

type PledgeFormValues = z.infer<typeof pledgeFormSchema>;

export default function PledgePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [project, setProject] = useState<
    (ProjectSchema & { id: string }) | null
  >(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGeneralPledge = searchParams.get("general") === "true";
  const [isLoadingProject, setIsLoadingProject] = useState(!isGeneralPledge);

  // Fetch project data on mount for non-general pledges
  useEffect(() => {
    if (isGeneralPledge) {
      setIsLoadingProject(false);
      return;
    }

    async function fetchProject() {
      try {
        const { slug } = await params;
        const response = await fetch(`/api/projects/${slug}`, {
          cache: "force-cache", // Cache response for 5 minutes
          next: { revalidate: 300 }, // Revalidate cache after 5 minutes
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch project: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        const projectResult = projectSchema.safeParse(data.project);
        if (!projectResult.success) {
          throw new Error("Invalid project data");
        }
        setProject({
          ...projectResult.data,
          id: data.project.id,
          cover_image: data.project.cover_image ?? undefined,
        });
        setFetchError(null);
      } catch (error) {
        console.error("PledgePage: Fetch error:", error);
        setFetchError("Failed to load project data. Please try again.");
        toast.error("Failed to load project");
      } finally {
        setIsLoadingProject(false);
      }
    }

    fetchProject();
  }, [params, isGeneralPledge]);

  const form = useForm<PledgeFormValues>({
    resolver: zodResolver(pledgeFormSchema),
    defaultValues: {
      amount: 10,
      pledgeType: "one_time",
      recurrenceInterval: undefined,
      paymentDay: undefined,
    },
  });

  // Calculate remaining amount
  const projectGoal = project?.goal_amount ?? 0;
  const amountRaised = project?.current_amount ?? 0;
  const remainingAmount = projectGoal - amountRaised;
  const isGoalReached = !isGeneralPledge && remainingAmount <= 0;

  // Validate amount against latest current_amount on submit
  const validateAmount = async (amount: number, slug: string) => {
    try {
      const response = await fetch(`/api/projects/${slug}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to validate amount");
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      const latestAmountRaised = data.project.amount_raised ?? 0;
      const latestRemaining = Math.max(0, projectGoal - latestAmountRaised);
      return { isValid: amount <= latestRemaining, latestRemaining };
    } catch (error) {
      console.error("PledgePage: Validation error:", error);
      return { isValid: false, latestRemaining: remainingAmount };
    }
  };

  const onSubmit = async (data: PledgeFormValues) => {
    if (!isGeneralPledge && !project?.id) {
      toast.error("Project not found");
      return;
    }

    if (!isGeneralPledge) {
      const { slug } = await params;
      const { isValid, latestRemaining } = await validateAmount(
        data.amount,
        slug
      );
      if (!isValid) {
        toast.error(
          `Amount cannot exceed the remaining goal of ₦${latestRemaining.toLocaleString(
            "en-NG",
            {
              style: "currency",
              currency: "NGN",
            }
          )}`
        );
        // Update project state with latest amount_raised
        setProject((prev) =>
          prev
            ? { ...prev, amount_raised: projectGoal - latestRemaining }
            : prev
        );
        return;
      }
    }

    startTransition(() => {
      const queryObj: Record<string, string> = {
        amount: data.amount.toString(),
        pledgeType: data.pledgeType,
      };
      if (data.recurrenceInterval) {
        queryObj.recurrenceInterval = data.recurrenceInterval;
      }
      if (data.paymentDay) {
        queryObj.paymentDay = data.paymentDay;
      }
      if (isGeneralPledge) {
        queryObj.general = "true";
      } else if (project?.slug) {
        queryObj.projectSlug = project.slug;
      }
      // Encode the query object as a base64 string to obscure it from direct manipulation
      const encoded = Buffer.from(JSON.stringify(queryObj)).toString("base64");
      router.push(`/pledge/card?data=${encodeURIComponent(encoded)}`);
    });
  };

  // Show loading state while fetching project data
  if (!isGeneralPledge && isLoadingProject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show error state if fetching fails
  if (!isGeneralPledge && fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 dark:text-red-400">{fetchError}</p>
      </div>
    );
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-6 lg:p-8 bg-white dark:bg-gray-900 mb-8">
      <div className="absolute top-0 left-0 z-50 w-full h-1 bg-gray-100 dark:bg-gray-700">
        <div
          className="h-1 bg-green-600 dark:bg-green-500 rounded-r-full transition-all duration-700 ease-in-out"
          style={{ width: "50%" }}
        />
      </div>

      <div className="mx-auto max-w-lg w-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="text-center border-b border-gray-300 pb-8">
              <p className="text-gray-700 dark:text-gray-300">
                {isGeneralPledge ? "General donation" : "Village pledge"}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                {isGeneralPledge
                  ? "Contribution"
                  : `Monthly contribution${
                      project ? ` to ${project.title}` : ""
                    }`}
              </h1>
            </div>

            {!isGeneralPledge && project && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                  <div
                    className="bg-green-600 h-2.5 rounded-full"
                    style={{
                      width: `${Math.min(
                        (amountRaised / projectGoal) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isGoalReached
                    ? "Funding goal reached!"
                    : `Remaining goal: ${toNaira(remainingAmount)}/${toNaira(
                        projectGoal
                      )}`}
                </p>
              </div>
            )}

            <div className="space-y-5">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Input amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-5 text-lg text-gray-600 font-medium">
                          ₦
                        </span>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          className="text-center pl-10"
                          min={5}
                          max={isGeneralPledge ? undefined : remainingAmount}
                          autoFocus
                          {...field}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            if (!isGeneralPledge && value > remainingAmount) {
                              form.setError("amount", {
                                type: "manual",
                                message: `Amount cannot exceed the remaining goal of ₦${remainingAmount.toLocaleString(
                                  "en-NG",
                                  { style: "currency", currency: "NGN" }
                                )}`,
                              });
                            } else {
                              form.clearErrors("amount");
                              field.onChange(value);
                            }
                          }}
                          disabled={isPending || isGoalReached}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <RadioGroup
                onValueChange={(value) =>
                  form.setValue("amount", Number(value))
                }
                defaultValue="10"
                className="grid grid-cols-3 gap-3"
                disabled={isPending || isGoalReached}
              >
                {["5000", "10000", "20000"].map((amount) => (
                  <div key={amount}>
                    <RadioGroupItem
                      value={amount}
                      id={`amount-${amount}`}
                      className="peer sr-only"
                      disabled={
                        isPending ||
                        isGoalReached ||
                        (!isGeneralPledge && Number(amount) > remainingAmount)
                      }
                    />
                    <label
                      htmlFor={`amount-${amount}`}
                      className={`
                        flex items-center justify-center rounded-lg border p-2 text-sm font-medium cursor-pointer
                        peer-disabled:cursor-not-allowed peer-disabled:opacity-50
                        ${
                          form.watch("amount") === Number(amount)
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:text-gray-900"
                        }
                        dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:border-gray-500
                      `}
                    >
                      {Number(amount).toLocaleString("en-NG", {
                        style: "currency",
                        currency: "NGN",
                      })}
                    </label>
                  </div>
                ))}
              </RadioGroup>

              <FormField
                control={form.control}
                name="pledgeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-center text-lg font-medium text-gray-700 dark:text-gray-300">
                      Pledge type
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-2 gap-3"
                        disabled={isPending || isGoalReached}
                      >
                        {["one_time", "recurring"].map((type) => (
                          <div key={type}>
                            <RadioGroupItem
                              value={type}
                              id={`pledge-type-${type}`}
                              className="peer sr-only"
                              disabled={isPending || isGoalReached}
                            />
                            <label
                              htmlFor={`pledge-type-${type}`}
                              className={`
                                flex items-center justify-center rounded-lg border p-2 text-sm font-medium cursor-pointer
                                peer-disabled:cursor-not-allowed peer-disabled:opacity-50
                                ${
                                  form.watch("pledgeType") === type
                                    ? "border-green-500 bg-green-50 text-green-700"
                                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:text-gray-900"
                                }
                                dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:border-gray-500
                              `}
                            >
                              {type === "one_time" ? "One-time" : "Recurring"}
                            </label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("pledgeType") === "recurring" && (
                <FormField
                  control={form.control}
                  name="recurrenceInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-center text-lg font-medium text-gray-700 dark:text-gray-300">
                        Recurrence interval
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-3 gap-3"
                          disabled={isPending || isGoalReached}
                        >
                          {["monthly", "quarterly", "yearly"].map(
                            (interval) => (
                              <div key={interval}>
                                <RadioGroupItem
                                  value={interval}
                                  id={`interval-${interval}`}
                                  className="peer sr-only"
                                  disabled={isPending || isGoalReached}
                                />
                                <label
                                  htmlFor={`interval-${interval}`}
                                  className={`
                                  flex items-center justify-center rounded-lg border p-2 text-sm font-medium cursor-pointer
                                  peer-disabled:cursor-not-allowed peer-disabled:opacity-50
                                  ${
                                    form.watch("recurrenceInterval") ===
                                    interval
                                      ? "border-green-500 bg-green-50 text-green-700"
                                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:text-gray-900"
                                  }
                                  dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:border-gray-500
                                `}
                                >
                                  {interval.charAt(0).toUpperCase() +
                                    interval.slice(1)}
                                </label>
                              </div>
                            )
                          )}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("pledgeType") === "recurring" && (
                <FormField
                  control={form.control}
                  name="paymentDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-center text-lg font-medium text-gray-700 dark:text-gray-300">
                        Preferred payment day
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-3 gap-3"
                          disabled={isPending || isGoalReached}
                        >
                          {["today", "1st", "28th"].map((day) => (
                            <div key={day}>
                              <RadioGroupItem
                                value={day}
                                id={`day-${day}`}
                                className="peer sr-only"
                                disabled={isPending || isGoalReached}
                              />
                              <label
                                htmlFor={`day-${day}`}
                                className={`
                                  flex items-center justify-center rounded-lg border p-2 text-sm font-medium cursor-pointer
                                  peer-disabled:cursor-not-allowed peer-disabled:opacity-50
                                  ${
                                    form.watch("paymentDay") === day
                                      ? "border-green-500 bg-green-50 text-green-700"
                                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:text-gray-900"
                                  }
                                  dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:border-gray-500
                                `}
                              >
                                {day.charAt(0).toUpperCase() + day.slice(1)}
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <footer>
              <Button
                type="submit"
                className="w-full rounded-lg bg-green-600 hover:bg-green-700 text-white"
                disabled={isPending || isGoalReached}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Next"
                )}
              </Button>
            </footer>
          </form>
        </Form>
      </div>
    </main>
  );
}
