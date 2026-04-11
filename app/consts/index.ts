import { Role } from "@/types/database.types";

export const roleHierarchy: Record<Role, number> = { admin: 3, moderator: 2, editor: 1, user: 0 };
