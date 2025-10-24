
"use client";

import { useState } from "react";
import { MoreHorizontal, LayoutGrid } from "lucide-react";
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
import { Armchair } from "lucide-react";


interface SeatProps {
  seat: PrismaSeat;
}

function Seat({ seat }: SeatProps) {
  const seatClasses = cn(
    'flex items-center justify-center w-10 h-10 rounded-md font-semibold text-xs',
    seat.type === 'SEAT' && 'border-2',
    seat.status === 'AVAILABLE' && 'bg-green-100 border-green-400 text-green-800 dark:bg-green-900/50 dark:border-green-800 dark:text-green-300',
    seat.status === 'OCCUPIED' && 'bg-muted border-muted-foreground/30 text-muted-foreground',
    seat.type === 'AISLE' && 'bg-transparent',
  );

  return (
    <div
      className={seatClasses}
      title={seat.type === 'SEAT' ? `Seat ${seat.seatNumber} - ${seat.status}` : ''}
    >
      {seat.type === 'SEAT' ? seat.seatNumber : ''}
    </div>
  );
}


interface BusActionsProps {
  bus: Bus & { layout: (SeatLayout & { seats: PrismaSeat[] }) | null };
}

export function BusActions({ bus }: BusActionsProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const { csrfToken } = useCsrf();

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
              <DropdownMenuItem disabled>Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
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
                This action cannot be undone. This will permanently delete the bus. You can only delete buses that are not assigned to any routes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? "Deleting..." : "Yes, delete it"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <DialogContent className="max-w-fit">
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
                  className="grid gap-2 p-4 bg-muted/30 rounded-lg border-2 border-dashed w-full" 
                  style={{ gridTemplateColumns: `repeat(${bus.layout.cols}, minmax(0, 1fr))` }}
                >
                  {sortedSeats.map(seat => (
                    <Seat key={seat.id} seat={seat} />
                  ))}
                </div>
              </ScrollArea>
              <div className="flex justify-center space-x-4 mt-4 text-sm">
                  <div className="flex items-center"><Armchair className="w-4 h-4 mr-2 text-green-600 dark:text-green-400"/>Available</div>
                  <div className="flex items-center"><Armchair className="w-4 h-4 mr-2 text-muted-foreground"/>Occupied</div>
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
