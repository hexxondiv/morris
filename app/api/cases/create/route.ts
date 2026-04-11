import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

// Validation schema for case creation
const caseFileSchema = z.object({
  url: z.string().url(),
  name: z.string(),
  size: z.number(),
  mimeType: z.string(),
});

const createCaseSchema = z.object({
  // Contact Information
  full_name: z.string().min(1, "Full name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email("Valid email is required").min(1, "Email is required"),
  state_id: z.string().regex(/^\d+$/, "Valid state is required"),
  lga_id: z.string().regex(/^\d+$/, "Valid LGA is required"),
  town: z.string().min(1, "Town is required"),

  // Reporting Information
  reporting_for: z.enum(["myself", "someone_else"]),
  beneficiary_name: z.string().optional(),
  relationship: z.string().optional(),

  // Case Details
  help_type: z.enum([
    "school_fees",
    "educational_materials",
    "infrastructure",
    "scholarship",
    "health_welfare",
    "other",
  ]),
  description: z.string().min(10, "Description must be at least 10 characters"),

  // Consent
  info_confirmed: z.boolean().refine((val) => val === true, {
    message: "You must confirm the information is truthful",
  }),
  contact_consent: z.boolean().refine((val) => val === true, {
    message: "You must consent to being contacted",
  }),
  updates_consent: z.boolean().optional(),

  // Files
  files: z.array(caseFileSchema).optional(),
}).refine(
  (data) => {
    // If reporting for someone else, beneficiary_name and relationship are required
    if (data.reporting_for === "someone_else") {
      return !!data.beneficiary_name && !!data.relationship;
    }
    return true;
  },
  {
    message: "Beneficiary name and relationship are required when reporting for someone else",
    path: ["beneficiary_name"],
  }
);

/**
 * POST /api/cases/create
 * Creates a new case report with associated files
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user if available (optional for public forms)
    const { userId } = await auth();

    // Parse and validate request body
    const body = await request.json();
    const validation = createCaseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Prepare case data
    const caseData = {
      full_name: data.full_name,
      phone: data.phone,
      email: data.email || null,
      state_id: parseInt(data.state_id, 10),
      lga_id: parseInt(data.lga_id, 10),
      town: data.town,
      reporting_for: data.reporting_for,
      beneficiary_name: data.beneficiary_name || null,
      relationship: data.relationship || null,
      help_type: data.help_type,
      description: data.description,
      info_confirmed: data.info_confirmed,
      contact_consent: data.contact_consent,
      updates_consent: data.updates_consent || false,
      user_id: userId || null,
      status: "pending" as const,
    };

    // Insert case into database
    const { data: newCase, error: caseError } = await supabaseAdmin
      .from("cases")
      .insert(caseData)
      .select("id, case_reference_id")
      .single();

    if (caseError) {
      console.error("Error creating case:", caseError);
      return NextResponse.json(
        { error: "Failed to create case", details: caseError.message },
        { status: 500 }
      );
    }

    // Insert associated files if any
    if (data.files && data.files.length > 0) {
      const fileRecords = data.files.map((file) => ({
        case_id: newCase.id,
        file_url: file.url,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.mimeType,
      }));

      const { error: filesError } = await supabaseAdmin
        .from("case_files")
        .insert(fileRecords);

      if (filesError) {
        console.error("Error inserting case files:", filesError);
        // Don't fail the entire request if file records fail
        // The case is already created, just log the error
      }
    }

    return NextResponse.json(
      {
        message: "Case submitted successfully",
        caseReferenceId: newCase.case_reference_id,
        caseId: newCase.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unexpected error creating case:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
