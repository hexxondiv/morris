// lib/schemas.ts
import { z } from 'zod';

// Project schema
export const projectFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  goal_amount: z.number().min(0),
  status: z.enum(["draft", "active", "completed", "cancelled", "proposed", "voting"]),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  sector: z.string().nullable().optional(),
  cover_image: z.string().optional(),
  body_html: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

// Full project schema (for API/database)
export const projectSchema = projectFormSchema.extend({
  id: z.string().optional(),
  creator_id: z.string().optional(),
  slug: z.string().optional(),
  current_amount: z.number().optional(),
  created_at: z.string().optional(),
});

export type ProjectFormSchema = z.infer<typeof projectFormSchema>;
export type ProjectSchema = z.infer<typeof projectSchema>;

export const pledgeSchema = z
  .object({
    amount: z.number().positive('Amount must be positive').min(50).max(999999999.99),
    pledgeType: z.enum(['one_time', 'recurring']),
    recurrenceInterval: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
    paymentDay: z.enum(['today', '1st', '28th']).optional(),
    projectId: z.string().uuid().optional(), // Optional for general donations
    userId: z.string().uuid().optional(), // Optional for new pledges
    anonymous: z.boolean().optional(),
  })
  .refine(
    (data) =>
      (data.pledgeType === 'recurring' && data.recurrenceInterval != null && data.paymentDay != null) ||
      (data.pledgeType === 'one_time' && data.recurrenceInterval == null && data.paymentDay == null),
    {
      message: 'Recurring pledges require an interval and payment day; one-time pledges must not have them',
      path: ['recurrenceInterval'],
    }
  );

// Transaction schema
export const transactionSchema = z.object({
  amount: z.number().positive().min(50).max(999999999.99),
  pledgeId: z.string().uuid().optional(),
  paymentType: z.enum(['pledge', 'deployment', 'expense']),
  projectId: z.string().uuid().optional(),
  anonymous: z.boolean().optional(),
  currency: z.string().default('NGN'),
  // Additional fields for outflow transactions
  chartId: z.string().uuid().optional(),
  description: z.string().optional(),
  paymentRef: z.string().optional(),
  timelineStageId: z.string().uuid().optional(),
});

// Event schema
export const eventSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  event_date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  location: z.string().max(200).nullable(),
  event_type: z.enum(['meeting', 'fundraiser', 'update', 'other']),
  recording_url: z
    .string()
    .url('Invalid URL')
    .nullable()
    .refine((val) => val === null || /^(https?:\/\/)?[A-Za-z0-9.-]+\/.*$/.test(val), 'Invalid recording URL'),
});

// Vote schema
export const voteSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  vote_value: z.boolean({ message: 'Vote must be true or false' }),
});

// Case file schema
export const caseFileSchema = z.object({
  url: z.string().url(),
  name: z.string(),
  size: z.number(),
  mimeType: z.string(),
});

// Case report schema
export const caseReportSchema = z
  .object({
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
  })
  .refine(
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

export type CaseReportSchema = z.infer<typeof caseReportSchema>;
export type CaseFileSchema = z.infer<typeof caseFileSchema>;
