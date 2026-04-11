import { prisma } from "@/lib/db/prisma";

export async function listStates() {
  return prisma.state.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function listLgasForState(stateId: number) {
  return prisma.localGovernmentArea.findMany({
    where: { stateId },
    select: { id: true, name: true, stateId: true },
    orderBy: { name: "asc" },
  });
}
