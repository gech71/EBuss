
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Bus, Seat as SeatType, SeatStatus, Ticket, TicketStatus } from "@prisma/client";
import { cn } from '@/lib/utils';
import { Armchair, CarFront } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';

// Define a client-side seat type that includes the 'SELECTED' status
type ClientSeat = SeatType & { status: SeatStatus | 'SELECTED' | 'OCCUPIED' };

interface SeatProps {
  seat: ClientSeat;
  onSelect: (seatNumber: string) => void;
  isSelectable: boolean;
}

function Seat({ seat, onSelect, isSelectable }: SeatProps) {
  const finalIsSelectable = isSelectable && seat.type === 'SEAT' && seat.status !== 'OCCUPIED';

  const seatClasses = cn(
    'flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-md font-semibold text-xs transition-all duration-200',
    seat.type === 'SEAT' && 'border-2',
    seat.status === 'AVAILABLE' && 'bg-green-100 border-green-400 text-green-800 hover:bg-green-200 hover:border-green-600 cursor-pointer dark:bg-green-900/50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900',
    seat.status === 'OCCUPIED' && 'bg-muted border-muted-foreground/30 text-muted-foreground cursor-not-allowed opacity-70',
    seat.status === 'SELECTED' && 'bg-accent border-accent-foreground text-accent-foreground cursor-pointer shadow-lg scale-110',
    seat.type === 'AISLE' && 'bg-transparent',
    seat.type === 'DRIVER' && 'bg-muted',
    !finalIsSelectable && seat.status !== 'SELECTED' && 'cursor-not-allowed opacity-70'
  );

  return (
    <div
      className={seatClasses}
      onClick={() => finalIsSelectable && onSelect(seat.seatNumber)}
      title={seat.type === 'SEAT' ? `Seat ${seat.seatNumber} - ${seat.status}` : ''}
    >
      {seat.type === 'SEAT' && <Armchair className="w-4 h-4 md:w-5 md:h-5" />}
      {seat.type === 'DRIVER' && <CarFront className="w-4 h-4 md:w-5 md:h-5" />}
    </div>
  );
}

interface SeatMapProps {
  bus: Bus & { layout: { seats: SeatType[], cols: number } };
  onSelectionChange: (selectedSeats: SeatType[]) => void;
  tickets?: { seatNumber: string }[];
}

const sortSeats = (seats: ClientSeat[]): ClientSeat[] => {
    return [...seats].sort((a, b) => {
        const rowA = a.seatNumber.charCodeAt(0);
        const colA = parseInt(a.seatNumber.substring(1), 10);
        const rowB = b.seatNumber.charCodeAt(0);
        const colB = parseInt(b.seatNumber.substring(1), 10);

        if (rowA < rowB) return -1;
        if (rowA > rowB) return 1;
        if (colA < colB) return -1;
        if (colA > colB) return 1;
        return 0;
    });
};


export function SeatMap({ bus, onSelectionChange, tickets = [] }: SeatMapProps) {
  const { toast } = useToast();

  const getInitialSeats = () => {
    const occupiedSeatNumbers = new Set(
        tickets.map(t => t.seatNumber)
    );

    return sortSeats(bus.layout.seats.map(s => ({
        ...s,
        status: occupiedSeatNumbers.has(s.seatNumber)
                ? 'OCCUPIED'
                : 'AVAILABLE'
    })));
  }

  // Initialize internal state with the bus's seats
  const [seats, setSeats] = useState<ClientSeat[]>(getInitialSeats);

  useEffect(() => {
    const selected = seats.filter(s => s.status === 'SELECTED');
    onSelectionChange(selected);
  }, [seats, onSelectionChange]);

  const handleSelectSeat = (seatNumber: string) => {
    setSeats(currentSeats => {
      const seat = currentSeats.find(s => s.seatNumber === seatNumber);
      
      if (seat?.status === 'SELECTED') {
        // Deselect the seat
        return currentSeats.map(s => s.seatNumber === seatNumber ? { ...s, status: 'AVAILABLE' } : s);
      }

      const selectedSeatsCount = currentSeats.filter(s => s.status === 'SELECTED').length;
      if (selectedSeatsCount >= 10) { 
        toast({
            title: 'Selection Limit',
            description: 'You can select a maximum of 10 seats per booking.',
            variant: 'destructive',
        });
        return currentSeats;
      }

      // Select the seat
      return currentSeats.map(s => s.seatNumber === seatNumber ? { ...s, status: 'SELECTED' } : s);
    });
  };
  
  return (
    <div className="flex flex-col items-center pt-4">
        <ScrollArea className="w-full">
            <div 
                className="mx-auto grid gap-1 md:gap-2 p-2 md:p-4 bg-muted/30 rounded-lg border-2 border-dashed w-max" 
                style={{ gridTemplateColumns: `repeat(${bus.layout.cols}, minmax(0, 1fr))` }}
            >
                {seats.map(seat => (
                <Seat 
                    key={seat.id} 
                    seat={seat} 
                    onSelect={handleSelectSeat}
                    isSelectable={seat.status !== 'OCCUPIED'}
                />
                ))}
            </div>
        </ScrollArea>
      
      <div className="flex justify-center flex-wrap gap-x-4 gap-y-2 mt-4 text-sm">
          <div className="flex items-center"><Armchair className="w-4 h-4 mr-2 text-green-600 dark:text-green-400"/>Available</div>
          <div className="flex items-center"><Armchair className="w-4 h-4 mr-2 text-accent"/>Selected</div>
          <div className="flex items-center"><Armchair className="w-4 h-4 mr-2 text-muted-foreground"/>Occupied</div>
      </div>
    </div>
  );
}
