import type { Decimal } from "@prisma/client/runtime/library";
import {
  CaseStatus,
  EventStatus,
  EventType,
  HelpType,
  ProjectStageStatus,
  ProjectStatus,
  ReportingFor,
  TransactionKind,
  TransactionStatus,
} from "@prisma/client";

export function dec(n: Decimal | null | undefined): number {
  if (n === null || n === undefined) return 0;
  return Number(n);
}

export function projectStatusToApi(s: ProjectStatus): string {
  return s.toLowerCase();
}

export function apiStatusesToPrisma(statuses: string[]): ProjectStatus[] {
  const map: Record<string, ProjectStatus> = {
    draft: ProjectStatus.DRAFT,
    proposed: ProjectStatus.PROPOSED,
    voting: ProjectStatus.VOTING,
    active: ProjectStatus.ACTIVE,
    completed: ProjectStatus.COMPLETED,
    cancelled: ProjectStatus.CANCELLED,
    archived: ProjectStatus.ARCHIVED,
  };
  return statuses
    .map((x) => map[x.toLowerCase()])
    .filter((x): x is ProjectStatus => Boolean(x));
}

export function transactionStatusToApi(s: TransactionStatus): string {
  return s.toLowerCase();
}

export function transactionKindToApi(k: TransactionKind): string {
  return k.toLowerCase();
}

export function caseStatusToApi(s: CaseStatus): string {
  return s.toLowerCase();
}

export function helpTypeToApi(h: HelpType): string {
  return h.toLowerCase();
}

export function reportingForToApi(r: ReportingFor): string {
  return r.toLowerCase();
}

export function eventStatusToApi(s: EventStatus): string {
  return s.toLowerCase();
}

export function eventTypeToApi(t: EventType): string {
  return t.toLowerCase();
}

export function projectStageStatusToApi(s: ProjectStageStatus): string {
  switch (s) {
    case ProjectStageStatus.IN_PROGRESS:
      return "in_progress";
    default:
      return s.toLowerCase();
  }
}
