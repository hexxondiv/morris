"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "../supabase-admin";

export async function getSuggestedChartCode(chart_type: "expense" | "deployment"): Promise<string> {
  try {
    const prefix = chart_type === "expense" ? "EXP" : "DEP";
    
    // Get all existing charts of this type to find the next available code
    const { data: charts, error } = await supabaseAdmin
      .from('charts')
      .select('code')
      .eq('chart_type', chart_type)
      .ilike('code', `${prefix}%`)
      .order('code', { ascending: false });

    if (error) {
      console.error("Error fetching charts for suggestion:", error);
      return `${prefix}001`;
    }

    if (!charts || charts.length === 0) {
      return `${prefix}001`;
    }

    // Extract numbers from existing codes and find the next available
    const numbers = charts
      .map(chart => {
        const match = chart.code.match(new RegExp(`^${prefix}(\\d+)`));
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => num > 0)
      .sort((a, b) => a - b);

    let nextNumber = 1;
    for (const num of numbers) {
      if (num === nextNumber) {
        nextNumber++;
      } else {
        break;
      }
    }
    
    return `${prefix}${nextNumber.toString().padStart(3, "0")}`;
    
  } catch (error) {
    console.error("Error getting suggested chart code:", error);
    const prefix = chart_type === "expense" ? "EXP" : "DEP";
    return `${prefix}001`;
  }
}


// Fetch charts
export async function getCharts(chart_type?: string) {
  try {
    let query = supabaseAdmin
    .from("charts")
    .select("*")
    .order('chart_type', { ascending: true })
    .order('code', { ascending: true });

  // Apply filter only if chart_type is provided
  if (chart_type) {
    query = query.eq("chart_type", chart_type);
  }

  const { data, error } = await query;

  if (error) {
    return { error: "Failed to fetch charts", data: null };
  }
  return { error: null, data: data || [] };
  } catch (error) {
    return {
      data: null,
      error: "An unexpected error occurred while fetching charts",
    };
  } 
}


// Chart validation schema
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

// Additional validation for chart codes based on type
const validateChartCode = (code: string, chart_type: "expense" | "deployment") => {
  const expectedPrefix = chart_type === "expense" ? "EXP" : "DEP";
  
  if (!code.startsWith(expectedPrefix)) {
    return {
      isValid: false,
      error: `${chart_type} chart codes must start with "${expectedPrefix}" (e.g., ${expectedPrefix}001)`,
    };
  }

  // Validate format: PREFIX + numbers (e.g., EXP001, DEP002)
  const codePattern = new RegExp(`^${expectedPrefix}\\d{3,}`);
  if (!codePattern.test(code)) {
    return {
      isValid: false,
      error: `Chart code should follow the format ${expectedPrefix}### (e.g., ${expectedPrefix}001)`,
    };
  }

  return { isValid: true, error: null };
};

// Response type
type CreateChartResponse = {
  success: boolean;
  data?: {
    id: string;
    code: string;
    name: string;
    chart_type: "expense" | "deployment";
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
    // Extract form data
    const rawData = {
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      public_name: formData.get("public_name") as string,
      description: formData.get("description") as string,
      chart_type: formData.get("chart_type") as "expense" | "deployment",
    };

    // Validate basic schema
    const validationResult = createChartSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: validationResult.error.flatten().fieldErrors,
      };
    }

    const validatedData = validationResult.data;

    // Additional chart code validation
    const codeValidation = validateChartCode(validatedData.code, validatedData.chart_type);
    if (!codeValidation.isValid) {
      return {
        success: false,
        error: codeValidation.error!,
        fieldErrors: { code: [codeValidation.error!] },
      };
    }

    // Check if chart code already exists
    const existingChart = await checkChartCodeExists(validatedData.code);
    if (existingChart) {
      return {
        success: false,
        error: "Chart code already exists",
        fieldErrors: { code: ["This chart code is already in use. Please choose a different code."] },
      };
    }

    // Create the chart in database
    const newChart = await createChartInDatabase(validatedData);

    // Revalidate relevant paths
    revalidatePath("/transactions");
    revalidatePath("/charts");
    revalidatePath("/admin/charts");

    return {
      success: true,
      data: newChart,
    };

  } catch (error) {
    console.error("Error creating chart:", error);
    
    return {
      success: false,
      error: error instanceof Error 
        ? `Failed to create chart: ${error.message}`
        : "An unexpected error occurred while creating the chart",
    };
  }
}

// Alternative function that accepts object instead of FormData
export async function createChartFromObject(data: {
  code: string;
  name: string;
  public_name: string;
  description: string;
  chart_type: "expense" | "deployment";
}): Promise<CreateChartResponse> {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  
  return createChart(formData);
}

// Supabase database operations
async function checkChartCodeExists(code: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('charts')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      console.error("Error checking chart code:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    return !!data;
    
  } catch (error) {
    console.error("Error checking chart code:", error);
    throw error;
  }
}

async function createChartInDatabase(data: {
  code: string;
  name: string;
  public_name: string;
  description: string;
  chart_type: "expense" | "deployment";
}) {
  try {
    const now = new Date().toISOString();
    
    const { data: chart, error } = await supabaseAdmin
      .from('charts')
      .insert({
        code: data.code,
        name: data.name,
        public_name: data.public_name,
        description: data.description,
        chart_type: data.chart_type,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating chart:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    return chart;
    
  } catch (error) {
    console.error("Error creating chart in database:", error);
    throw error;
  }
}
