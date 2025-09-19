
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Gem } from "lucide-react";

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState("super@example.com");
  const [password, setPassword] = useState("password");
  const { login } = useData();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const result = login(email, password);
    
    if (result && result.user.ownerId === 'super-admin') {
      toast({
        title: "Login Successful",
        description: `Welcome back, ${result.user.name}!`,
      });
      localStorage.setItem('authToken', result.token);
      router.push("/super-admin");
    } else {
      toast({
        title: "Access Denied",
        description: "You do not have permission to access this area.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Gem className="h-6 w-6 text-primary"/>
            Super Admin Login
          </CardTitle>
          <CardDescription>Enter your credentials for platform administration.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="super@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit">Login</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
