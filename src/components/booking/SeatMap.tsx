
"use client";

import { useState } from 'react';
import type { Bus, Route, Seat as SeatType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Armchair, CarFront } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SeatProps {
  seat: SeatType;
  onSelect: (id: string) => void;
}

function Seat({ seat, onSelect }: SeatProps) {
  const isSelectable = seat.status === 'available' || seat.status === 'selected';
  const isSelected = seat.status === 'selected';

  const seatClasses = cn(
    'flex items-center justify-center w-10 h-10 rounded-md font-semibold text-xs transition-all duration-200',
    seat.type === 'seat' && 'border-2',
    seat.status === 'available' && 'bg-secondary/50 border-primary/20 text-primary/80 hover:bg-accent/30 hover:border-accent cursor-pointer',
    seat.status === 'occupied' && 'bg-muted border-muted-foreground/30 text-muted-foreground cursor-not-allowed opacity-70',
    seat.status === 'selected' && 'bg-accent border-accent-foreground text-accent-foreground cursor-pointer shadow-lg scale-110',
    seat.type === 'aisle' && 'bg-transparent',
    seat.type === 'driver' && 'bg-muted'
  );

  return (
    <div
      className={seatClasses}
      onClick={() => isSelectable && onSelect(seat.id)}
      title={seat.type === 'seat' ? `Seat ${seat.id} - ${seat.status}` : ''}
    >
      {seat.type === 'seat' && <Armchair className="w-5 h-5" />}
      {seat.type === 'driver' && <CarFront className="w-5 h-5" />}
    </div>
  );
}

interface SeatMapProps {
  bus: Bus;
  route: Route;
  seats: SeatType[];
  setSeats: React.Dispatch<React.SetStateAction<SeatType[]>>;
}

export function SeatMap({ bus, seats, setSeats }: SeatMapProps) {
  const { toast } = useToast();

  const handleSelectSeat = (id: string) => {
    setSeats(currentSeats => {
      const seat = currentSeats.find(s => s.id === id);
      
      // If the clicked seat is already selected, deselect it.
      if (seat?.status === 'selected') {
        return currentSeats.map(s => s.id === id ? { ...s, status: 'available' } : s);
      }

      // If it's not selected, proceed with selection logic.
      const selectedSeatsCount = currentSeats.filter(s => s.status === 'selected').length;
      if (selectedSeatsCount >= 10) { // Limit selection
        toast({
            title: 'Selection Limit',
            description: 'You can select a maximum of 10 seats per booking.',
            variant: 'destructive',
        });
        return currentSeats;
      }

      return currentSeats.map(s => s.id === id ? { ...s, status: 'selected' } : s);
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
          <div className="flex items-center"><Armchair className="w-4 h-4 mr-2 text-secondary-foreground opacity-50"/>Available</div>
          <div className="flex items-center"><Armchair className="w-4 h-4 mr-2 text-accent"/>Selected</div>
          <div className="flex items-center"><Armchair className="w-4 h-4 mr-2 text-muted-foreground"/>Occupied</div>
      </div>
    </div>
  );
}
