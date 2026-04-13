import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, Folder, DollarSign, FileText } from "lucide-react";
import { getCaseStatistics } from "@/lib/actions/cases";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const users = [];
  const projects = [];
  const pledges = [];
  const caseStats = await getCaseStatistics();

  const totalUsers = users.length;
  const totalProjects = projects.length;
  // const totalPledges = pledges.reduce((sum, pledge) => sum + pledge.amount, 0);
  const totalPledges = 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          {/* <Button onClick={deleteAllUsers}>Delete all Users</Button> */}
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Active users in the system</p>
            <Link href="/admin/users">
              <Button variant="link" className="mt-2">Manage Users</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground">Active and completed projects</p>
            <Link href="/admin/projects">
              <Button variant="link" className="mt-2">Manage Projects</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pledges</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPledges.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total pledged amount</p>
            <Link href="/admin/pledges">
              <Button variant="link" className="mt-2">Manage Pledges</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Case Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{caseStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {caseStats.pending} pending • {caseStats.reviewing} reviewing
            </p>
            <Link href="/admin/cases">
              <Button variant="link" className="mt-2">Manage Cases</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}