
"use client";

import type { Bus, Seat as SeatType } from "@prisma/client";
import { cn } from '@/lib/utils';
import { Armchair, CarFront } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SeatProps {
  seat: SeatType;
  onSelect: (seatNumber: string) => void;
}

function Seat({ seat, onSelect }: SeatProps) {
  const isSelectable = seat.type === 'SEAT' && (seat.status === 'AVAILABLE' || seat.status === 'SELECTED');

  const seatClasses = cn(
    'flex items-center justify-center w-10 h-10 rounded-md font-semibold text-xs transition-all duration-200',
    seat.type === 'SEAT' && 'border-2',
    seat.status === 'AVAILABLE' && seat.type === 'SEAT' && 'bg-green-100 border-green-400 text-green-800 hover:bg-green-200 hover:border-green-600 cursor-pointer dark:bg-green-900/50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900',
    seat.status === 'OCCUPIED' && 'bg-muted border-muted-foreground/30 text-muted-foreground cursor-not-allowed opacity-70',
    seat.status === 'SELECTED' && 'bg-accent border-accent-foreground text-accent-foreground cursor-pointer shadow-lg scale-110',
    seat.type === 'AISLE' && 'bg-transparent',
    seat.type === 'DRIVER' && 'bg-muted'
  );

  return (
    <div
      className={seatClasses}
      onClick={() => isSelectable && onSelect(seat.seatNumber)}
      title={seat.type === 'SEAT' ? `Seat ${seat.seatNumber} - ${seat.status}` : ''}
    >
      {seat.type === 'SEAT' && <Armchair className="w-5 h-5" />}
      {seat.type === 'DRIVER' && <CarFront className="w-5 h-5" />}
    </div>
  );
}


interface SeatMapProps {
  bus: Bus & { layout: { seats: SeatType[], cols: number } };
  seats: SeatType[];
  setSeats: React.Dispatch<React.SetStateAction<SeatType[]>>;
}

export function SeatMap({ bus, seats, setSeats }: SeatMapProps) {
  const { toast } = useToast();

  const handleSelectSeat = (seatNumber: string) => {
    setSeats(currentSeats => {
      const seat = currentSeats.find(s => s.seatNumber === seatNumber);
      
      if (seat?.status === 'SELECTED') {
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

      return currentSeats.map(s => s.seatNumber === seatNumber ? { ...s, status: 'SELECTED' } : s);
    });
  };
  
  return (
    <div className="flex flex-col items-center pt-4">
      <div 
        className="grid gap-2 p-4 bg-muted/30 rounded-lg border-2 border-dashed" 
        style={{ gridTemplateColumns: `repeat(${bus.layout.cols}, minmax(0, 1fr))` }}
      >
        {seats.map(seat => (
          <Seat key={seat.id} seat={seat} onSelect={handleSelectSeat} />
        ))}
      </div>
      
      <div className="flex justify-center space-x-4 mt-4 text-sm">
          <div className="flex items-center"><Armchair className="w-4 h-4 mr-2 text-green-600 dark:text-green-400"/>Available</div>
          <div className="flex items-center"><Armchair className="w-4 h-4 mr-2 text-accent"/>Selected</div>
          <div className="flex items-center"><Armchair className="w-4 h-4 mr-2 text-muted-foreground"/>Occupied</div>
      </div>
    </div>
  );
}
