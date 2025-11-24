
"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { deleteBusRouteAction } from "./actions";
import { useToast } from "@/hooks/use-toast";
import { useCsrf } from "@/hooks/useCsrf";

interface DeleteMappingButtonProps {
    id: string;
    busName: string;
    originName: string;
    destinationName: string;
}

export function DeleteMappingButton({ id, busName, originName, destinationName }: DeleteMappingButtonProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const { csrfToken } = useCsrf();
    
    const handleDelete = () => {
        if (!csrfToken) {
            toast({ title: "Error", description: "Invalid session. Please refresh.", variant: "destructive"});
            return;
        }
        startTransition(async () => {
            const result = await deleteBusRouteAction(id, csrfToken);
            if (result.success) {
                toast({ title: "Mapping Deleted", description: result.message });
            } else {
                toast({ title: "Deletion Failed", description: result.message, variant: "destructive" });
            }
        });
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isPending}>
                    <Trash2 className="h-4 w-4 text-destructive"/>
                    <span className="sr-only">Delete mapping</span>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the mapping for '{busName}' on the '{originName} - {destinationName}' route.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isPending}>
                        {isPending ? "Deleting..." : "Yes, delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
