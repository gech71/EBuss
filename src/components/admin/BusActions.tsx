
"use client";

import { useState } from "react";
import { MoreHorizontal, LayoutGrid, Pencil, Armchair } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteBusAction } from "@/app/admin/buses/actions";
import type { Bus, SeatLayout, Seat as PrismaSeat } from '@prisma/client';
import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { useCsrf } from "@/hooks/useCsrf";
import Link from "next/link";


interface SeatProps {
  seat: PrismaSeat;
}

function Seat({ seat }: SeatProps) {
  const seatClasses = cn(
    'flex items-center justify-center w-10 h-10 rounded-md font-semibold text-xs transition-all',
    seat.type === 'SEAT' && 'border-2 bg-card',
    seat.type === 'AISLE' && 'bg-transparent',
  );

  return (
    <div
      className={seatClasses}
      title={seat.type === 'SEAT' ? `Seat ${seat.seatNumber}` : 'Aisle'}
    >
      {seat.type === 'SEAT' ? <Armchair className="w-5 h-5" /> : ''}
    </div>
  );
}


interface BusActionsProps {
  bus: Bus & { 
    layout: (SeatLayout & { seats: PrismaSeat[] }) | null;
    _count: { routes: number };
  };
}

export function BusActions({ bus }: BusActionsProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const { csrfToken, loading: csrfLoading } = useCsrf();
  const canEdit = bus._count.routes === 0;

  const handleDelete = async () => {
    if (!csrfToken) {
        toast({ title: "Error", description: "Invalid session. Please refresh.", variant: "destructive"});
        return;
    }
    setIsDeleting(true);

    const result = await deleteBusAction(bus.id, csrfToken);
    setIsDeleting(false);

    if (result.success) {
      toast({
        title: "Bus Deleted",
        description: result.message,
      });
    } else {
      toast({
        title: "Deletion Failed",
        description: result.message,
        variant: "destructive",
      });
    }
  };
  
  const sortedSeats = bus.layout?.seats.sort((a, b) => {
    const rowA = a.seatNumber.charCodeAt(0);
    const colA = parseInt(a.seatNumber.substring(1));
    const rowB = b.seatNumber.charCodeAt(0);
    const colB = parseInt(b.seatNumber.substring(1));

    if (rowA !== rowB) {
      return rowA - rowB;
    }
    return colA - colB;
  }) || [];


  return (
    <>
      <Dialog>
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
              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  View Layout
                </DropdownMenuItem>
              </DialogTrigger>
              <Link href={canEdit ? `/admin/buses/${bus.id}/edit` : '#'} passHref legacyBehavior>
                <DropdownMenuItem asChild disabled={!canEdit} onSelect={(e) => { if (!canEdit) e.preventDefault(); }}>
                  <a>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </a>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <AlertDialogTrigger asChild>
                <DropdownMenuItem disabled={csrfLoading} className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the bus. You can only delete buses that are not assigned to any routes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting || csrfLoading} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? "Deleting..." : "Yes, delete it"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <DialogContent className="max-w-full sm:max-w-fit">
          <DialogHeader>
            <DialogTitle>Seat Layout for {bus.name}</DialogTitle>
            <DialogDescription>
              A visual representation of the bus seating arrangement.
            </DialogDescription>
          </DialogHeader>
          {bus.layout ? (
            <div className="flex flex-col items-center pt-4">
               <ScrollArea className="h-[60vh] w-full">
                <div 
                  className="grid gap-1 md:gap-2 p-2 bg-muted/30 rounded-lg border-2 border-dashed w-full" 
                  style={{ gridTemplateColumns: `repeat(${bus.layout.cols}, minmax(0, 1fr))` }}
                >
                  {sortedSeats.map(seat => (
                    <Seat key={seat.id} seat={seat} />
                  ))}
                </div>
              </ScrollArea>
               <div className="flex justify-center flex-wrap gap-x-4 gap-y-2 mt-4 text-sm">
                  <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-md border-2 bg-card flex items-center justify-center"><Armchair className="w-5 h-5" /></div> Seat</div>
                  <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-md" /> Aisle</div>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No layout information available for this bus.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
