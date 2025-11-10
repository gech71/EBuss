
import prisma from "@/lib/prisma";
import { CreateUserForm } from "@/components/super-admin/CreateUserForm";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { validateRequest } from "@/lib/server/auth";

export default async function SuperAdminSettingsPage() {
  const { user } = await validateRequest();
  const showPasswordMessage = user?.passwordChangeRequired;

  const owners = await prisma.busOwner.findMany({
    orderBy: {
      name: "asc",
    },
  });

  const adminUsers = await prisma.user.findMany({
    where: {
      role: "ADMIN",
    },
    include: {
      busOwner: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const existingEmails = adminUsers.map((user) => user.email);

  return (
    <div className="space-y-6">
       {showPasswordMessage && (
         <Alert>
           <Info className="h-4 w-4" />
           <AlertTitle>Password Change Required</AlertTitle>
           <AlertDescription>
             For security reasons, you must change your password before you can access other parts of the dashboard.
           </AlertDescription>
         </Alert>
       )}
       <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>
            Manage your super admin account password.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <ChangePasswordForm />
        </CardContent>
      </Card>
      
      <Separator />

      <CreateUserForm owners={owners} existingEmails={existingEmails} />

      <Card>
        <CardHeader>
          <CardTitle>Existing Admin Users</CardTitle>
          <CardDescription>
            A list of all administrative users on the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Assigned Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.busOwner?.name || "N/A"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {adminUsers.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
              <Users className="mx-auto h-12 w-12" />
              <p className="mt-4">No admin users have been created yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
