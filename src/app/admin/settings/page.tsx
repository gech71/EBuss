
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { validateRequest } from "@/lib/server/auth";

export default async function AdminSettingsPage() {
  const { user } = await validateRequest();
  const showPasswordMessage = user?.passwordChangeRequired;

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
            Manage your account settings and password.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
