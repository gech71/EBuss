"use client";

import { useRouter } from "next/navigation";
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
import Link from "next/link";
import { updateLocationAction } from "@/app/admin/locations/actions";
import { SubmitButton } from "@/components/SubmitButton";
import React from "react";
import { useCsrf } from "@/hooks/useCsrf";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Location } from "@prisma/client";

interface EditLocationFormProps {
  location: Location;
}

export function EditLocationForm({ location }: EditLocationFormProps) {
  const { csrfToken, loading: csrfLoading } = useCsrf();
  const router = useRouter();
  const { toast } = useToast();

  const [state, formAction] = React.useActionState(
    async (prevState: any, formData: FormData) => {
      const result = await updateLocationAction(prevState, formData);
      return result;
    },
    { success: null, message: null }
  );

  useEffect(() => {
    if (state?.message) {
      toast({
        title: state.success ? "Success" : "Error",
        description: state.message,
        variant: state.success ? "default" : "destructive",
      });
      if (state.success) {
        router.push("/admin/locations");
      }
    }
  }, [state, toast, router]);

  if (!csrfToken) {
    return <div>Loading form...</div>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={location.id} />
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Location</CardTitle>
          <CardDescription>Update the name for the location.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Location Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={location.name}
                placeholder="e.g., New York, NY"
                required
              />
            </div>
            {state?.message && !state.success && (
              <p className="text-sm text-destructive">{state.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/locations">Cancel</Link>
          </Button>
          <SubmitButton disabled={csrfLoading}>Save Changes</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
