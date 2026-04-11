import type { DefaultSession } from "next-auth";
import type { Role } from "@/types/database.types";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      firstName: string | null;
      lastName: string | null;
      avatarUrl: string | null;
    };
  }
}
