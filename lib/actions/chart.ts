"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createLedgerAccountFromChartInput,
  ledgerAccountExistsByCode,
  listLedgerAccountsByChartType,
  suggestNextChartCode,
  type ChartType,
} from "@/lib/repositories/ledger-account-repository";

export async function getSuggestedChartCode(
  chart_type: ChartType
): Promise<string> {
  return suggestNextChartCode(chart_type);
}

export async function getCharts(chart_type?: string) {
  try {
    const ct =
      chart_type === "expense" || chart_type === "deployment"
        ? chart_type
        : undefined;
    const rows = await listLedgerAccountsByChartType(ct);
    return { error: null, data: rows };
  } catch {
    return {
      data: null,
      error: "An unexpected error occurred while fetching charts",
    };
  }
}

const createChartSchema = z.object({
  code: z
    .string()
    .min(1, "Chart code is required")
    .max(20, "Chart code must be 20 characters or less")
    .regex(/^[A-Z0-9]+$/, "Chart code must contain only uppercase letters and numbers")
    .transform((val) => val.toUpperCase()),
  name: z
    .string()
    .min(1, "Chart name is required")
    .max(100, "Chart name must be 100 characters or less")
    .trim(),
  public_name: z
    .string()
    .min(1, "Public name is required")
    .max(100, "Public name must be 100 characters or less")
    .trim(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be 500 characters or less")
    .trim(),
  chart_type: z.enum(["expense", "deployment"], {
    errorMap: () => ({ message: "Chart type must be either 'expense' or 'deployment'" }),
  }),
});

const validateChartCode = (code: string, chart_type: ChartType) => {
  const expectedPrefix = chart_type === "expense" ? "EXP" : "DEP";

  if (!code.startsWith(expectedPrefix)) {
    return {
      isValid: false,
      error: `${chart_type} chart codes must start with "${expectedPrefix}" (e.g., ${expectedPrefix}001)`,
    };
  }

  const codePattern = new RegExp(`^${expectedPrefix}\\d{3,}`);
  if (!codePattern.test(code)) {
    return {
      isValid: false,
      error: `Chart code should follow the format ${expectedPrefix}### (e.g., ${expectedPrefix}001)`,
    };
  }

  return { isValid: true, error: null };
};

type CreateChartResponse = {
  success: boolean;
  data?: {
    id: string;
    code: string;
    name: string;
    chart_type: ChartType;
    public_name: string;
    description: string;
    created_at: string;
    updated_at: string;
  };
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createChart(formData: FormData): Promise<CreateChartResponse> {
  try {
    const rawData = {
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      public_name: formData.get("public_name") as string,
      description: formData.get("description") as string,
      chart_type: formData.get("chart_type") as ChartType,
    };

    const validationResult = createChartSchema.safeParse(rawData);

    if (!validationResult.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: validationResult.error.flatten().fieldErrors,
      };
    }

    const validatedData = validationResult.data;

    const codeValidation = validateChartCode(validatedData.code, validatedData.chart_type);
    if (!codeValidation.isValid) {
      return {
        success: false,
        error: codeValidation.error!,
        fieldErrors: { code: [codeValidation.error!] },
      };
    }

    if (await ledgerAccountExistsByCode(validatedData.code)) {
      return {
        success: false,
        error: "Chart code already exists",
        fieldErrors: {
          code: ["This chart code is already in use. Please choose a different code."],
        },
      };
    }

    const chart = await createLedgerAccountFromChartInput(validatedData);

    revalidatePath("/transactions");
    revalidatePath("/charts");
    revalidatePath("/admin/charts");

    return {
      success: true,
      data: {
        id: chart.id,
        code: chart.code,
        name: chart.name,
        chart_type: validatedData.chart_type,
        public_name: chart.publicName ?? "",
        description: chart.description ?? "",
        created_at: chart.createdAt.toISOString(),
        updated_at: chart.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Error creating chart:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? `Failed to create chart: ${error.message}`
          : "An unexpected error occurred while creating the chart",
    };
  }
}

export async function createChartFromObject(data: {
  code: string;
  name: string;
  public_name: string;
  description: string;
  chart_type: ChartType;
}): Promise<CreateChartResponse> {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });

  return createChart(formData);
}
