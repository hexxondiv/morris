"use client";

import { UserActionsDialogue } from "@/app/(dashboard)/admin/users/user-action-dialogue";
import { ColumnDef } from "@tanstack/react-table";
import { formatDate } from "../utils";

export interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  firstName: string;
  lastName: string;
}

export const userColumns: ColumnDef<User>[] = [
  {
    id: "index",
    header: "#",
    cell: ({ row }) => row.index + 1,
    size: 40,
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) =>
      `${row.original.firstName} ${row.original.lastName}`.trim() || "N/A",
  },
  {
    accessorKey: "role",
    header: "Role",
  },
  {
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <UserActionsDialogue user={row.original} />,
  },
];
