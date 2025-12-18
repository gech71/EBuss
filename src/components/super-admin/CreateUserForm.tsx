
"use client";

import { useState, useTransition, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Eye, EyeOff, Check, X } from "lucide-react";
import type { BusOwner } from "@prisma/client";
import { createUserAction } from "@/app/super-admin/(dashboard)/settings/actions";
import { cn } from "@/lib/utils";
import { useCsrf } from "@/hooks/useCsrf";

interface CreateUserFormProps {
  owners: BusOwner[];
  existingEmails: string[];
}

const passwordRules = [
    { text: "At least 10 characters long", regex: /.{10,}/ },
    { text: "At least one uppercase letter", regex: /[A-Z]/ },
    { text: "At least one lowercase letter", regex: /[a-z]/ },
    { text: "At least one number", regex: /[0-9]/ },
    { text: "At least one special character", regex: /[^A-Za-z0-9]/ },
];

function PasswordStrength({ password }: { password?: string }) {
    if (!password) return null;
    
    return (
        <ul className="text-sm text-muted-foreground space-y-1 mt-2">
            {passwordRules.map((rule, index) => {
                const isValid = rule.regex.test(password);
                return (
                    <li key={index} className={cn("flex items-center gap-2", isValid ? "text-green-600" : "text-destructive")}>
                        {isValid ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        <span>{rule.text}</span>
                    </li>
                );
            })}
        </ul>
    );
}

export function CreateUserForm({ owners, existingEmails }: CreateUserFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [password, setPassword] = useState("");
  const { csrfToken, loading: csrfLoading } = useCsrf();


  const handleSubmit = (formData: FormData) => {
    const email = formData.get("email") as string;
    if (existingEmails.includes(email.toLowerCase())) {
      toast({
        title: "Email already exists",
        description: "A user with this email address is already registered.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const result = await createUserAction(formData);
      if (result?.success) {
        toast({
          title: "User Created",
          description: result.message,
        });
        formRef.current?.reset();
        setPassword("");
      } else {
        toast({
          title: "Creation Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Admin User</CardTitle>
        <CardDescription>
          Create a new administrative user and assign them to a bus owner.
        </CardDescription>
      </CardHeader>
      <form ref={formRef} action={handleSubmit}>
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Jane Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="e.g., jane.doe@example.com"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter a secure password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              <PasswordStrength password={password} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerId">Assign to Bus Owner</Label>
              <Select name="ownerId" required>
                <SelectTrigger id="ownerId">
                  <SelectValue placeholder="Select a bus owner..." />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isPending || csrfLoading}>
            <UserPlus className="mr-2 h-4 w-4" />
            {isPending ? "Creating..." : "Create User"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
