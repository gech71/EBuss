
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
import { cookies } from "next/headers";

export default function ForcePasswordChangePage() {
  const cookieStore = cookies();
  const csrfToken = cookieStore.get("csrf_token")?.value;

  return (
    <div className="space-y-6">
        <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Password Change Required</AlertTitle>
            <AlertDescription>
                For security reasons, you must change your password before you can access the dashboard.
            </AlertDescription>
        </Alert>
       <Card>
        <CardHeader>
          <CardTitle>Create a New Password</CardTitle>
          <CardDescription>
            Enter your temporary password and create a new, secure password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <ChangePasswordForm csrfToken={csrfToken} />
        </CardContent>
      </Card>
    </div>
  );
}
