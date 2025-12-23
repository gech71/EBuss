import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { SetupPasswordForm } from "./SetupPasswordForm";
import { Logo } from "@/components/Logo";

interface SetupPasswordPageProps {
  params: { token: string };
}

async function validateToken(token: string) {
  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findUnique({
      where: { passwordSetupToken: hashedToken },
      select: { passwordSetupExpires: true }
    });

    if (!user || !user.passwordSetupExpires || new Date() > user.passwordSetupExpires) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

export default async function SetupPasswordPage({ params }: SetupPasswordPageProps) {
  const { token } = params;

  if (!token) {
    notFound();
  }

  const isTokenValid = await validateToken(token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
                <Logo />
            </div>
            <CardTitle>Set Up Your Password</CardTitle>
            <CardDescription>
                Create a new, secure password for your NibTeraBuss administrator account.
            </CardDescription>
        </CardHeader>
        <CardContent>
          {isTokenValid ? (
            <SetupPasswordForm token={token} />
          ) : (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertTitle>Invalid or Expired Link</AlertTitle>
              <AlertDescription>
                This password setup link is no longer valid. Please contact a super administrator to request a new one.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
