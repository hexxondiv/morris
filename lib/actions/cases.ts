"use server";

import { CaseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  getCaseStatistics as loadCaseStatistics,
  getCaseWithDetailsById,
  listCasesPaginated,
} from "@/lib/repositories/case-repository";
import type { Case, CaseNote, CaseStatus as CaseStatusApi, CaseWithDetails } from "@/types/case.types";

function toPrismaCaseStatus(s: CaseStatusApi): CaseStatus {
  return s.toUpperCase() as CaseStatus;
}

export async function fetchCases(
  page: number,
  limit: number,
  search: string
): Promise<{ data: Case[]; total: number }> {
  const { data, total } = await listCasesPaginated(page, limit, search);
  return { data: data as Case[], total };
}

export async function fetchCaseById(id: string): Promise<CaseWithDetails | null> {
  const row = await getCaseWithDetailsById(id);
  return row as CaseWithDetails | null;
}

export async function updateCaseStatus(
  caseId: string,
  status: CaseStatusApi
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.case.update({
      where: { id: caseId },
      data: { status: toPrismaCaseStatus(status) },
    });
    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating case status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Update failed",
    };
  }
}

export async function addCaseNote(
  caseId: string,
  note: string,
  adminUserId: string,
  _adminName: string
): Promise<{ success: boolean; error?: string; note?: CaseNote }> {
  try {
    const created = await prisma.caseNote.create({
      data: {
        caseId,
        note,
        authorUserId: adminUserId,
      },
    });
    const author = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { displayName: true, firstName: true, lastName: true },
    });
    const admin_name =
      author?.displayName?.trim() ||
      [author?.firstName, author?.lastName].filter(Boolean).join(" ").trim() ||
      "Admin";

    return {
      success: true,
      note: {
        id: created.id,
        case_id: created.caseId,
        note: created.note,
        admin_user_id: created.authorUserId,
        admin_name,
        created_at: created.createdAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error("Error adding case note:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add note",
    };
  }
}

export async function acceptCase(
  caseId: string,
  adminUserId: string,
  adminName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await prisma.case.updateMany({
      where: { id: caseId, status: CaseStatus.PENDING },
      data: { status: CaseStatus.REVIEWING },
    });
    if (res.count === 0) {
      return { success: false, error: "Case not found or not pending" };
    }
    await prisma.caseNote.create({
      data: {
        caseId,
        note: "Case accepted and moved to reviewing status.",
        authorUserId: adminUserId,
      },
    });
    void adminName;
    return { success: true };
  } catch (error: unknown) {
    console.error("Unexpected error accepting case:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Accept failed",
    };
  }
}

export async function rejectCase(
  caseId: string,
  _adminUserId: string,
  _adminName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await prisma.case.deleteMany({
      where: { id: caseId, status: CaseStatus.PENDING },
    });
    if (res.count === 0) {
      return { success: false, error: "Case not found or not pending" };
    }
    return { success: true };
  } catch (error: unknown) {
    console.error("Unexpected error rejecting case:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Reject failed",
    };
  }
}

export async function getCaseStatistics() {
  return loadCaseStatistics();
}
