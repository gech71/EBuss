
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Bus, Seat as SeatLayoutItem, TripSeat } from "@prisma/client";
import { cn } from '@/lib/utils';
import { Armchair, CarFront } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';

type ClientSeatStatus = 'AVAILABLE' | 'LOCKED' | 'BOOKED' | 'SELECTED';

interface ClientSeat {
  seatNumber: string;
  type: 'SEAT' | 'AISLE' | 'DRIVER';
  status: ClientSeatStatus;
}

interface SeatProps {
  seat: ClientSeat;
  onSelect: (seatNumber: string) => void;
}

function Seat({ seat, onSelect }: SeatProps) {
  const isSelectable = seat.type === 'SEAT' && seat.status === 'AVAILABLE';
  const isSelected = seat.status === 'SELECTED';

  const seatClasses = cn(
    'flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-md font-semibold text-xs transition-all duration-200',
    seat.type === 'SEAT' && 'border-2',
    seat.status === 'AVAILABLE' && 'bg-green-100 border-green-400 text-green-800 hover:bg-green-200 hover:border-green-600 cursor-pointer dark:bg-green-900/50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900',
    (seat.status === 'BOOKED' || seat.status === 'LOCKED') && 'bg-muted border-muted-foreground/30 text-muted-foreground cursor-not-allowed opacity-70',
    isSelected && 'bg-accent border-accent-foreground text-accent-foreground cursor-pointer shadow-lg scale-110',
    seat.type === 'AISLE' && 'bg-transparent',
    seat.type === 'DRIVER' && 'bg-muted'
  );

  return (
    <div
      className={seatClasses}
      onClick={() => isSelectable && onSelect(seat.seatNumber)}
      title={seat.type === 'SEAT' ? `Seat ${seat.seatNumber} - ${seat.status}` : ''}
    >
      {seat.type === 'SEAT' && <Armchair className="w-4 h-4 md:w-5 md:h-5" />}
      {seat.type === 'DRIVER' && <CarFront className="w-4 h-4 md:w-5 md:h-5" />}
    </div>
  );
}

interface SeatMapProps {
  busLayout: { seats: SeatLayoutItem[], cols: number };
  tripSeats: TripSeat[];
  onSelectionChange: (selectedSeats: string[]) => void;
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


export function SeatMap({ busLayout, tripSeats, onSelectionChange }: SeatMapProps) {
  const { toast } = useToast();
  
  const [selectedSeatNumbers, setSelectedSeatNumbers] = useState<string[]>([]);
  
  const clientSeats = useMemo(() => {
    const tripSeatMap = new Map(tripSeats.map(ts => [ts.seatNumber, ts.status]));
    
    const seats = busLayout.seats.map(layoutSeat => {
      const isSelected = selectedSeatNumbers.includes(layoutSeat.seatNumber);
      if (isSelected) {
        return { ...layoutSeat, status: 'SELECTED' as ClientSeatStatus };
      }
      
      const tripStatus = tripSeatMap.get(layoutSeat.seatNumber);
      return { ...layoutSeat, status: tripStatus || 'AVAILABLE' };
    });
    
    return sortSeats(seats);
  }, [busLayout.seats, tripSeats, selectedSeatNumbers]);

  useEffect(() => {
    onSelectionChange(selectedSeatNumbers);
  }, [selectedSeatNumbers, onSelectionChange]);

  const handleSelectSeat = (seatNumber: string) => {
    setSelectedSeatNumbers(currentSelected => {
      if (currentSelected.includes(seatNumber)) {
        return currentSelected.filter(s => s !== seatNumber);
      }
      
      if (currentSelected.length >= 10) { 
        toast({
            title: 'Selection Limit',
            description: 'You can select a maximum of 10 seats per booking.',
            variant: 'destructive',
        });
        return currentSelected;
      }

      return [...currentSelected, seatNumber];
    });
  };
  
  return (
    <div className="flex flex-col items-center pt-4">
        <ScrollArea className="w-full">
            <div 
                className="mx-auto grid gap-1 md:gap-2 p-2 md:p-4 bg-muted/30 rounded-lg border-2 border-dashed w-max" 
                style={{ gridTemplateColumns: `repeat(${busLayout.cols}, minmax(0, 1fr))` }}
            >
                {clientSeats.map(seat => (
                  <Seat key={seat.id} seat={seat} onSelect={handleSelectSeat} />
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
