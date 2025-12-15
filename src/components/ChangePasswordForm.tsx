
"use client";

import { useState, useTransition, useRef, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Check, X, LogOut } from "lucide-react";
import { changePasswordAction, logout } from "@/app/lib/actions";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";

const passwordRules = [
    { text: "At least 10 characters long", regex: /.{10,}/ },
    { text: "At least one uppercase letter", regex: /[A-Z]/ },
    { text: "At least one lowercase letter", regex: /[a-z]/ },
    { text: "At least one number", regex: /[0-9]/ },
    { text: "At least one special character", regex: /[^A-Za-z0-9]/ },
];

function PasswordStrength({ password, onValidationChange }: { password?: string, onValidationChange: (isValid: boolean) => void }) {
    if (!password) {
        useEffect(() => {
            onValidationChange(false);
        }, [onValidationChange]);
        return null;
    }
    
    const validationResults = passwordRules.map(rule => rule.regex.test(password));
    const allValid = validationResults.every(Boolean);

    useEffect(() => {
        onValidationChange(allValid);
    }, [allValid, onValidationChange]);
    
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

interface ChangePasswordFormProps {
  csrfToken?: string;
}

export function ChangePasswordForm({ csrfToken }: ChangePasswordFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordPolicyMet, setIsPasswordPolicyMet] = useState(false);


  const handleSubmit = (formData: FormData) => {
    const newPasswordValue = formData.get("newPassword") as string;
    const confirmPasswordValue = formData.get("confirmPassword") as string;

    if (newPasswordValue !== confirmPasswordValue) {
      toast({
        title: "Passwords do not match",
        description: "Please ensure the new passwords match.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      if (!csrfToken) {
          toast({ title: "Error", description: "Invalid session. Please refresh.", variant: "destructive" });
          return;
      }
      const result = await changePasswordAction(formData);
      if (result?.success) {
        toast({
          title: "Password Updated",
          description: result.message,
        });
        formRef.current?.reset();
        setNewPassword("");
        setConfirmPassword("");
        // Redirect to login page after successful password change
        window.location.href = '/login';
      } else {
        toast({
          title: "Update Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleLogout = async () => {
    startLogoutTransition(async () => {
      await logout();
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      window.location.href = '/';
    });
  };

  const isButtonDisabled = isPending || !csrfToken || !isPasswordPolicyMet || newPassword !== confirmPassword || newPassword === "";

  return (
    <Card className="max-w-xl border-0 shadow-none">
      <form ref={formRef} action={handleSubmit}>
        <input type="hidden" name="csrfToken" value={csrfToken || ''} />
        <CardContent className="space-y-4 pt-6 p-0">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
             <div className="relative">
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  required
                />
                <Button
                  type="button" variant="ghost" size="icon"
                  className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? <EyeOff /> : <Eye />}
                </Button>
              </div>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type={showNew ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                     <Button
                      type="button" variant="ghost" size="icon"
                      className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNew(!showNew)}
                    >
                      {showNew ? <EyeOff /> : <Eye />}
                    </Button>
                </div>
                 <PasswordStrength password={newPassword} onValidationChange={setIsPasswordPolicyMet} />
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
                      type="button" variant="ghost" size="icon"
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
        </CardContent>
        <CardFooter className="p-0 pt-6 flex-col items-stretch gap-4">
          <Button type="submit" disabled={isButtonDisabled}>
            {isPending ? "Updating..." : "Update Password"}
          </Button>
          <Separator />
           <Button type="button" variant="outline" onClick={handleLogout} disabled={isLoggingOut}>
             <LogOut className="mr-2 h-4 w-4" />
            {isLoggingOut ? "Logging out..." : "Logout & Return to Homepage"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
