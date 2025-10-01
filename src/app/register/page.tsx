
"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { registerAction } from "@/app/register/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState } from "react";

const initialState = {
    success: false,
    message: '',
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button className="w-full" type="submit" disabled={pending}>
            {pending ? "Creating Account..." : "Create Account"}
        </Button>
    )
}

export default function RegisterPage() {
  const [state, formAction] = useFormState(registerAction, initialState);
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
      if (state.success) {
          toast({
              title: "Registration Successful",
              description: state.message,
          });
          router.push("/login");
      }
  }, [state, router, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>Sign up to start booking your bus tickets.</CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  name="password"
                  type={showPassword ? "text" : "password"} 
                  required 
                />
                 <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                >
                    {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span className="sr-only">
                        {showPassword ? "Hide password" : "Show password"}
                    </span>
                </Button>
              </div>
            </div>
            {state.message && !state.success && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Registration Failed</AlertTitle>
                    <AlertDescription>{state.message}</AlertDescription>
                </Alert>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <SubmitButton />
            <Separator className="my-2" />
             <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Button variant="link" asChild className="p-0 h-auto">
                <Link href="/login">
                  Login
                </Link>
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
