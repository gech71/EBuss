"use client";

import React, { useEffect, useState } from "react";
import { requestPasswordResetAction } from "@/app/lib/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, ArrowLeft, Mail } from "lucide-react";
import { useCsrf } from "@/hooks/useCsrf";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  const { loading: csrfLoading } = useCsrf();

  const isDisabled = pending || csrfLoading;

  return (
    <Button
      className="w-full"
      disabled={isDisabled}
      type="submit"
      id="forgot-password-submit"
    >
      {pending ? (
        "Sending..."
      ) : csrfLoading ? (
        "Initializing..."
      ) : (
        <>
          <Mail className="mr-2 h-4 w-4" />
          Send Reset Link
        </>
      )}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const { csrfToken } = useCsrf();
  const initialState = { message: "", success: false };
  const [state, dispatch] = React.useActionState(
    requestPasswordResetAction,
    initialState
  );
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (state?.success === true && state?.message) {
      setEmailSent(true);
    }
  }, [state]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>
            {emailSent
              ? "Check your email for a reset link."
              : "Enter your email address and we'll send you a link to reset your password."}
          </CardDescription>
        </CardHeader>

        {emailSent ? (
          <>
            <CardContent className="space-y-4">
              <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
                <CheckCircle2 className="h-4 w-4 !text-green-600 dark:!text-green-400" />
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground text-center">
                Didn&apos;t receive an email? Check your spam folder, or wait a few minutes and try again.
              </p>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button variant="outline" asChild className="w-full" id="back-to-login-link">
                <Link href="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
              </Button>
            </CardFooter>
          </>
        ) : (
          <form action={dispatch}>
            <CardContent className="space-y-4">
              <input type="hidden" name="csrfToken" value={csrfToken || ""} />
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your.email@example.com"
                  required
                  autoFocus
                />
              </div>
              {state?.message && !state?.success && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription data-error-message>
                    {state.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <SubmitButton />
              <Separator className="my-2" />
              <Button variant="ghost" asChild className="w-full text-muted-foreground" id="back-to-login-from-form">
                <Link href="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
