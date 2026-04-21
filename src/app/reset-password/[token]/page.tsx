import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ResetPasswordPageProps {
  params: { token: string };
}

async function validateResetToken(token: string) {
  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findUnique({
      where: { passwordResetToken: hashedToken },
      select: { passwordResetExpires: true }
    });

    if (!user || !user.passwordResetExpires || new Date() > user.passwordResetExpires) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  const isTokenValid = await validateResetToken(token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
                <Logo />
            </div>
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>
                Choose a new, secure password for your NibTeraBuss account.
            </CardDescription>
        </CardHeader>
        <CardContent>
          {isTokenValid ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="space-y-4">
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>Invalid or Expired Link</AlertTitle>
                <AlertDescription>
                  This password reset link is no longer valid. It may have expired or already been used.
                </AlertDescription>
              </Alert>
              <Button asChild className="w-full" variant="outline" id="request-new-reset-link">
                <Link href="/forgot-password">
                  Request a New Reset Link
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
