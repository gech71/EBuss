"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Bus, Route, Seat as SeatType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Armchair, CarFront, CircleHelp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SeatProps {
  seat: SeatType;
  onSelect: (id: string) => void;
}

function Seat({ seat, onSelect }: SeatProps) {
  const isSelectable = seat.status === 'available' && seat.type === 'seat';
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
}

export function SeatMap({ bus, route }: SeatMapProps) {
  const [seats, setSeats] = useState<SeatType[]>(bus.layout.seats);
  const router = useRouter();
  const { toast } = useToast();

  const handleSelectSeat = (id: string) => {
    setSeats(currentSeats => {
      const selectedSeatsCount = currentSeats.filter(s => s.status === 'selected').length;
      const seat = currentSeats.find(s => s.id === id);

      if (seat?.status === 'selected') {
        return currentSeats.map(s => s.id === id ? { ...s, status: 'available' } : s);
      }

      if (selectedSeatsCount >= 5) {
        toast({
            title: 'Selection Limit',
            description: 'You can select a maximum of 5 seats per booking.',
            variant: 'destructive',
        });
        return currentSeats;
      }

      return currentSeats.map(s => s.id === id ? { ...s, status: 'selected' } : s);
    });
  };

  const selectedSeats = seats.filter(s => s.status === 'selected');
  const totalPrice = selectedSeats.length * route.price;

  const handleConfirmBooking = () => {
    if (selectedSeats.length === 0) {
      toast({
          title: 'No Seats Selected',
          description: 'Please select at least one seat to proceed.',
          variant: 'destructive',
      });
      return;
    }
    // In a real app, this would go to a payment page.
    // Here, we'll just navigate to a confirmation/ticket page.
    const ticketId = `ticket-${route.id}-${Date.now()}`;
    router.push(`/ticket/${ticketId}`);
  };

  return (
    <div className="flex flex-col items-center">
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

      <div className="w-full max-w-md mt-8">
        <Card className="bg-secondary/30">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Your Selection</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedSeats.length > 0 ? (
                <div className="space-y-2">
                    <p className="font-semibold">Selected Seats:</p>
                    <div className="flex flex-wrap gap-2">
                        {selectedSeats.map(s => <span key={s.id} className="bg-primary text-primary-foreground text-sm font-bold py-1 px-3 rounded-full">{s.id}</span>)}
                    </div>
                </div>
            ) : (
                <p className="text-muted-foreground text-center py-4">No seats selected yet.</p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-stretch space-y-4">
            <div className="flex justify-between items-center text-xl font-bold">
                <span>Total Price:</span>
                <span className="text-primary">${totalPrice.toFixed(2)}</span>
            </div>
            <Button size="lg" onClick={handleConfirmBooking} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={selectedSeats.length === 0}>
                Confirm Booking
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
