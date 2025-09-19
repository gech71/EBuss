
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/hooks/use-toast";
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
  const [result, dispatch] = useActionState(authenticate, undefined);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (result) {
      try {
        const data = JSON.parse(result);
        if (data.token) {
          toast({
            title: "Login Successful",
            description: `Welcome back, ${data.name}!`,
          });
          
          localStorage.setItem('authToken', data.token);
          
          if (data.role === 'SUPER_ADMIN') {
              router.push("/super-admin");
          } else if (data.role === 'ADMIN') {
              router.push("/admin");
          } else {
              router.push("/");
          }
        }
      } catch (e) {
        // This means the result is an error string, which will be handled by the alert below.
      }
    }
  }, [result, router, toast]);

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
        <form action={dispatch}>
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
            {result && !result.startsWith('{') && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {result}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <LoginButton />
            <Separator className="my-2" />
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
