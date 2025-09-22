
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
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { changePasswordAction } from "@/app/lib/actions";

export function ChangePasswordForm() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (formData: FormData) => {
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please ensure the new passwords match.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const result = await changePasswordAction(formData);
      if (result?.success) {
        toast({
          title: "Password Updated",
          description: result.message,
        });
        formRef.current?.reset();
      } else {
        toast({
          title: "Update Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Card className="max-w-xl border-0 shadow-none">
      <CardHeader className="p-0">
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          Enter your current and new password to update your account.
        </CardDescription>
      </CardHeader>
      <form ref={formRef} action={handleSubmit}>
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
                    />
                     <Button
                      type="button" variant="ghost" size="icon"
                      className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNew(!showNew)}
                    >
                      {showNew ? <EyeOff /> : <Eye />}
                    </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      required
                    />
                     <Button
                      type="button" variant="ghost" size="icon"
                      className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? <EyeOff /> : <Eye />}
                    </Button>
                </div>
              </div>
           </div>
        </CardContent>
        <CardFooter className="p-0 pt-6">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Updating..." : "Update Password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
