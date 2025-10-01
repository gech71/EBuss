
"use client";

import { useState, useEffect, useTransition } from "react";
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
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [csrfToken, setCsrfToken] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [lockoutTime, setLockoutTime] = useState(0);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchCsrfToken() {
      try {
        const response = await fetch('/api/csrf');
        const { token } = await response.json();
        setCsrfToken(token);
      } catch (error) {
        console.error("Failed to fetch CSRF token", error);
        setErrorMessage("Could not initialize secure session. Please try again.");
      }
    }
    fetchCsrfToken();
  }, []);

  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setTimeout(() => {
        setLockoutTime(lockoutTime - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
        setErrorMessage(undefined);
    }
  }, [lockoutTime]);


  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lockoutTime > 0) return;

    const formData = new FormData(event.currentTarget);
    
    startTransition(async () => {
      const resultMessage = await authenticate(undefined, formData);
      if (resultMessage === 'success') {
        // Successful login is handled by redirect inside the action
        toast({ title: "Login Successful!" });
        // The redirect in the action will navigate the user.
      } else {
        setErrorMessage(resultMessage);
        const lockoutMatch = resultMessage?.match(/try again in (\d+) seconds/);
        if (lockoutMatch && lockoutMatch[1]) {
          setLockoutTime(parseInt(lockoutMatch[1], 10));
        }
      }
    });
  };

  function LoginButton() {
    const isButtonDisabled = isPending || lockoutTime > 0;
    const buttonText = () => {
        if (isPending) return 'Logging in...';
        if (lockoutTime > 0) return `Try again in ${lockoutTime}s`;
        return 'Login';
    }

    return (
      <Button className="w-full" aria-disabled={isButtonDisabled} disabled={isButtonDisabled} type="submit">
        {buttonText()}
      </Button>
    );
  }

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
        <form onSubmit={handleSubmit}>
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
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
