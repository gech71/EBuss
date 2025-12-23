"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useCsrf } from "@/hooks/useCsrf";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setupPasswordAction } from "@/app/lib/actions";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { CardFooter } from "@/components/ui/card";

interface SetupPasswordFormProps {
  token: string;
}

const passwordRules = [
  { text: "At least 10 characters long", regex: /.{10,}/ },
  { text: "At least one uppercase letter", regex: /[A-Z]/ },
  { text: "At least one lowercase letter", regex: /[a-z]/ },
  { text: "At least one number", regex: /[0-9]/ },
  { text: "At least one special character", regex: /[^A-Za-z0-9]/ },
];

function PasswordStrength({ validationResults }: { validationResults: boolean[] }) {
  return (
    <ul className="text-sm text-muted-foreground space-y-1 mt-2">
      {passwordRules.map((rule, index) => {
        const isValid = validationResults[index];
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

export function SetupPasswordForm({ token }: SetupPasswordFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { csrfToken, loading: csrfLoading } = useCsrf();
  const formRef = useRef<HTMLFormElement>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validationResults = useMemo(() => {
    return passwordRules.map((rule) => rule.regex.test(newPassword));
  }, [newPassword]);

  const isPasswordPolicyMet = useMemo(() => {
    return validationResults.every(Boolean);
  }, [validationResults]);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await setupPasswordAction(formData);
      if (result.success) {
        toast({
          title: "Password Set Successfully!",
          description: "You are now being redirected to the dashboard.",
        });
        // On success, the action logs the user in and redirects, so we just need to push them to the right place.
        router.push('/admin');
      } else {
        toast({
          title: "Setup Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };

  const isButtonDisabled =
    isPending ||
    csrfLoading ||
    !isPasswordPolicyMet ||
    newPassword !== confirmPassword ||
    newPassword === "";

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-6">
      <input type="hidden" name="csrfToken" value={csrfToken || ""} />
      <input type="hidden" name="token" value={token} />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showNew ? "text" : "password"}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowNew(!showNew)}
            >
              {showNew ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          <PasswordStrength validationResults={validationResults} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-sm text-destructive mt-2">Passwords do not match.</p>
          )}
        </div>
      </div>
      <CardFooter className="p-0 pt-6">
        <Button type="submit" disabled={isButtonDisabled} className="w-full">
            {isPending ? "Setting Password..." : "Set Password and Login"}
        </Button>
      </CardFooter>
    </form>
  );
}
