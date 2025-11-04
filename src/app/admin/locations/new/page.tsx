
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createLocationAction } from "@/app/admin/locations/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { useCsrf } from "@/hooks/useCsrf";
import { useFormState } from "react-dom";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";


export default function NewLocationPage() {
    const { csrfToken, loading: csrfLoading } = useCsrf();
    const router = useRouter();
    const { toast } = useToast();

    // The form action is now handled by useFormState for better feedback
    const [state, formAction] = useFormState(async (prevState: any, formData: FormData) => {
        const result = await createLocationAction(formData);
        if (result?.success === false) {
            return result;
        }
        // Redirect is handled inside the action on success
    }, null);

    useEffect(() => {
        if(state?.message) {
             toast({
                title: state.success ? "Success" : "Error",
                description: state.message,
                variant: state.success ? "default" : "destructive",
            });
        }
    }, [state, toast]);

    return (
        <form action={formAction}>
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Add New Location</CardTitle>
                    <CardDescription>Enter the name for the new bus stop or city.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Location Name</Label>
                            <Input 
                                id="name" 
                                name="name"
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
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <SubmitButton disabled={csrfLoading}>Save Location</SubmitButton>
                </CardFooter>
            </Card>
        </form>
    );
}
