
'use client';

import Link from 'next/link';
import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteOwnerAction } from '@/app/super-admin/(dashboard)/owners/actions';
import type { BusOwner } from '@prisma/client';
import { useCsrf } from '@/hooks/useCsrf';

interface OwnerActionsProps {
  owner: BusOwner & {
    _count: {
      buses: number;
      admins: number;
    }
  };
}

export function OwnerActions({ owner }: OwnerActionsProps) {
  const { toast } = useToast();
  const { csrfToken } = useCsrf();

  const handleDelete = async () => {
    // CSRF token is not needed for super-admin actions in this implementation,
    // but a robust app would include it. We will call the action directly.
    const result = await deleteOwnerAction(owner.id);
    if (result.success) {
      toast({
        title: "Owner Deleted",
        description: `"${owner.name}" has been removed.`,
      });
    } else {
      toast({
        title: "Deletion Failed",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/super-admin/owners/${owner.id}/edit`}>Edit</Link>
          </DropdownMenuItem>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            owner and all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
            Yes, delete it
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
