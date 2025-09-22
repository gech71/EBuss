
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { authenticate } from "@/app/lib/actions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [errorMessage, formAction] = useActionState(authenticate, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                defaultValue="admin@example.com"
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
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <LoginButton />
            <Separator className="my-2" />
             <Button variant="outline" asChild className="w-full">
                <Link href="/">Continue as a customer</Link>
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Button variant="link" asChild className="p-0 h-auto">
                <Link href="/register">
                  Register
                </Link>
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

function LoginButton() {
  const { pending } = useFormStatus();
 
  return (
    <Button className="w-full" aria-disabled={pending} type="submit">
      {pending ? 'Logging in...' : 'Login'}
    </Button>
  );
}
