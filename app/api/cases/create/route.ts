import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";
import { createCaseIntake } from "@/lib/services/case-intake-service";

const caseFileSchema = z.object({
  url: z.string().url(),
  name: z.string(),
  size: z.number(),
  mimeType: z.string(),
});

const createCaseSchema = z
  .object({
    full_name: z.string().min(1, "Full name is required"),
    phone: z.string().min(10, "Valid phone number is required"),
    email: z.string().email("Valid email is required").min(1, "Email is required"),
    state_id: z.string().regex(/^\d+$/, "Valid state is required"),
    lga_id: z.string().regex(/^\d+$/, "Valid LGA is required"),
    town: z.string().min(1, "Town is required"),
    reporting_for: z.enum(["myself", "someone_else"]),
    beneficiary_name: z.string().optional(),
    relationship: z.string().optional(),
    help_type: z.enum([
      "school_fees",
      "educational_materials",
      "infrastructure",
      "scholarship",
      "health_welfare",
      "other",
    ]),
    description: z.string().min(10, "Description must be at least 10 characters"),
    info_confirmed: z.boolean().refine((val) => val === true, {
      message: "You must confirm the information is truthful",
    }),
    contact_consent: z.boolean().refine((val) => val === true, {
      message: "You must consent to being contacted",
    }),
    updates_consent: z.boolean().optional(),
    files: z.array(caseFileSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.reporting_for === "someone_else") {
        return !!data.beneficiary_name && !!data.relationship;
      }
      return true;
    },
    {
      message:
        "Beneficiary name and relationship are required when reporting for someone else",
      path: ["beneficiary_name"],
    }
  );

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const reporterUserId = session?.user?.id ?? null;

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

    const result = await createCaseIntake({
      full_name: data.full_name,
      phone: data.phone,
      email: data.email,
      state_id: parseInt(data.state_id, 10),
      lga_id: parseInt(data.lga_id, 10),
      town: data.town,
      reporting_for: data.reporting_for,
      beneficiary_name: data.beneficiary_name,
      relationship: data.relationship,
      help_type: data.help_type,
      description: data.description,
      info_confirmed: data.info_confirmed,
      contact_consent: data.contact_consent,
      updates_consent: data.updates_consent ?? false,
      reporter_user_id: reporterUserId,
      files: data.files,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: "Case submitted successfully",
        caseReferenceId: result.caseReferenceId,
        caseId: result.caseId,
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
