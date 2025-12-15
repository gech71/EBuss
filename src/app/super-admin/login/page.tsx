"use client";

import { authenticate } from "@/app/lib/actions";
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
import { AlertCircle, Gem } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCsrf } from "@/hooks/useCsrf";
import React, { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

function LoginButton() {
  const { pending } = useFormStatus();
  const [lockoutTime, setLockoutTime] = useState(0);
  const { csrfToken, loading: csrfLoading } = useCsrf();

  useEffect(() => {
    const component = document.querySelector("[data-error-message]");
    if (component) {
      const errorMessage = component.textContent;
      const lockoutMatch = errorMessage?.match(/try again in (\d+) seconds/);
      if (lockoutMatch && lockoutMatch[1]) {
        setLockoutTime(parseInt(lockoutMatch[1], 10));
      }
    }
  }, [pending]);

  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setTimeout(() => {
        setLockoutTime(lockoutTime - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [lockoutTime]);

  const isButtonDisabled = pending || lockoutTime > 0 || csrfLoading;

  const buttonText = () => {
    if (pending) return "Logging in...";
    if (lockoutTime > 0) return `Try again in ${lockoutTime}s`;
    if (csrfLoading) return "Initializing...";
    return "Login";
  };

  return (
    <Button
      className="w-full"
      aria-disabled={isButtonDisabled}
      disabled={isButtonDisabled}
      type="submit"
    >
      {buttonText()}
    </Button>
  );
}

export default function SuperAdminLoginPage() {
  const { csrfToken, loading: csrfLoading } = useCsrf();
  const { toast } = useToast();

  const initialState = { message: "", success: false };
  const [state, dispatch] = React.useActionState(authenticate, initialState);

  useEffect(() => {
    if (state?.success === true) {
      toast({ title: "Login Successful!" });
    }
  }, [state, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Gem className="h-6 w-6 text-primary" />
            Super Admin Login
          </CardTitle>
          <CardDescription>
            Enter your credentials for platform administration.
          </CardDescription>
        </CardHeader>
        <form action={dispatch}>
          <CardContent className="space-y-4">
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                defaultValue="super@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                defaultValue="password"
              />
            </div>
            {state?.message && !state.success && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription data-error-message>
                  {state.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <LoginButton />
            <Separator className="my-2" />
            <Button variant="outline" asChild className="w-full">
              <Link href="/login">Switch to Admin Login</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
