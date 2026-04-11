import { randomBytes } from "crypto";
import {
  CaseStatus,
  HelpType,
  ReportingFor,
  CaseFileKind,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

function mapReportingFor(v: string): ReportingFor {
  return v === "someone_else" ? ReportingFor.SOMEONE_ELSE : ReportingFor.MYSELF;
}

function mapHelpType(v: string): HelpType {
  const m: Record<string, HelpType> = {
    school_fees: HelpType.SCHOOL_FEES,
    educational_materials: HelpType.EDUCATIONAL_MATERIALS,
    infrastructure: HelpType.INFRASTRUCTURE,
    scholarship: HelpType.SCHOLARSHIP,
    health_welfare: HelpType.HEALTH_WELFARE,
    other: HelpType.OTHER,
  };
  return m[v] ?? HelpType.OTHER;
}

async function allocateCaseReference(
  tx: Prisma.TransactionClient
): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const ref = `CASE-${randomBytes(4).toString("hex").toUpperCase()}`;
    const clash = await tx.case.findUnique({
      where: { caseReferenceId: ref },
      select: { id: true },
    });
    if (!clash) return ref;
  }
  throw new Error("CASE_REF");
}

export type CaseIntakePayload = {
  full_name: string;
  phone: string;
  email: string;
  state_id: number;
  lga_id: number;
  town: string;
  reporting_for: "myself" | "someone_else";
  beneficiary_name?: string;
  relationship?: string;
  help_type: string;
  description: string;
  info_confirmed: boolean;
  contact_consent: boolean;
  updates_consent: boolean;
  reporter_user_id: string | null;
  files?: Array<{
    url: string;
    name: string;
    size: number;
    mimeType: string;
  }>;
};

export async function createCaseIntake(
  payload: CaseIntakePayload
): Promise<
  { ok: true; caseId: string; caseReferenceId: string } | { ok: false; error: string }
> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const caseReferenceId = await allocateCaseReference(tx);

      const c = await tx.case.create({
        data: {
          caseReferenceId,
          reporterUserId: payload.reporter_user_id,
          fullName: payload.full_name,
          phone: payload.phone,
          email: payload.email || null,
          stateId: payload.state_id,
          lgaId: payload.lga_id,
          town: payload.town,
          reportingFor: mapReportingFor(payload.reporting_for),
          beneficiaryName: payload.beneficiary_name ?? null,
          relationship: payload.relationship ?? null,
          helpType: mapHelpType(payload.help_type),
          description: payload.description,
          infoConfirmed: payload.info_confirmed,
          contactConsent: payload.contact_consent,
          updatesConsent: payload.updates_consent,
          status: CaseStatus.PENDING,
          submittedAt: new Date(),
        },
      });

      if (payload.files?.length) {
        for (const f of payload.files) {
          await tx.caseFile.create({
            data: {
              caseId: c.id,
              uploadedByUserId: payload.reporter_user_id,
              kind: CaseFileKind.SUPPORTING_DOCUMENT,
              storageKey: `case-upload:${c.id}:${randomBytes(6).toString("hex")}`,
              fileUrl: f.url,
              fileName: f.name,
              fileSize: f.size,
              mimeType: f.mimeType,
            },
          });
        }
      }

      return { caseId: c.id, caseReferenceId };
    });

    return { ok: true, ...result };
  } catch (e) {
    console.error("createCaseIntake:", e);
    return { ok: false, error: "Failed to create case" };
  }
}
