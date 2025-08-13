
"use client";

import { useState, useMemo, useEffect } from 'react';
import { notFound, useRouter } from 'next/navigation';
import type { Seat as SeatType, Discount, DiscountTier, Route, Bus } from '@/lib/types';
import { useData } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

import { Header } from '@/components/Header';
import { SeatMap } from '@/components/booking/SeatMap';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Clock, Bus as BusIcon, ChevronsUpDown, Tag } from 'lucide-react';

export default function BookPage({ params }: { params: { id: string } }) {
  const { routes, buses, discounts, addBooking } = useData();
  const { toast } = useToast();
  const router = useRouter();
  
  const route = routes.find((r) => r.id === params.id);
  const bus = route ? buses.find((b) => b.id === route.busId) : undefined;

  const [seats, setSeats] = useState<SeatType[]>(bus?.layout.seats || []);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (bus) {
      // Auto-select the first available seat on initial load
      const firstAvailable = bus.layout.seats.find(s => s.type === 'seat' && s.status === 'available');
      if (firstAvailable) {
        setSeats(bus.layout.seats.map(s => s.id === firstAvailable.id ? { ...s, status: 'selected' } : s));
      } else {
        setSeats(bus.layout.seats);
      }
    }
  }, [bus]);
  
  if (!route || !bus) {
    notFound();
  }

  const selectedSeats = seats.filter(s => s.status === 'selected');
  
  const applicableDiscountInfo = useMemo(() => {
    const now = new Date();
    const selectedCount = selectedSeats.length;
    if (selectedCount === 0) return null;

    let bestDiscount: Discount | null = null;
    let bestTier: DiscountTier | null = null;

    for (const discount of discounts) {
      if (now >= discount.startDate && now <= discount.endDate) {
        for (const tier of discount.tiers) {
          if (selectedCount >= tier.minTickets && selectedCount <= tier.maxTickets) {
            if (!bestTier || tier.percentage > bestTier.percentage) {
              bestDiscount = discount;
              bestTier = tier;
            }
          }
        }
      }
    }
    
    return bestDiscount && bestTier ? { discount: bestDiscount, tier: bestTier } : null;
  }, [selectedSeats.length, discounts]);

  const originalPrice = selectedSeats.length * route.price;
  const discountAmount = applicableDiscountInfo ? originalPrice * (applicableDiscountInfo.tier.percentage / 100) : 0;
  const totalPrice = originalPrice - discountAmount;

  const handleConfirmBooking = () => {
    if (selectedSeats.length === 0) {
      toast({
          title: 'No Seats Selected',
          description: 'Please select at least one seat to proceed.',
          variant: 'destructive',
      });
      return;
    }
    
    const ticketId = `ticket-${route.id}-${Date.now()}`;
    
    addBooking({
        id: ticketId,
        routeId: route.id,
        seats: selectedSeats,
        totalPrice: totalPrice,
        bookingTime: new Date(),
        passengerName: 'John Doe',
        passengerEmail: 'john.doe@example.com',
    });

    router.push(`/ticket/${ticketId}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <Header />
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-3xl">Confirm Your Trip</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Trip Summary */}
                <div className="p-4 rounded-lg border bg-background">
                  <div className="flex items-center font-semibold text-xl">
                    <span>{route.origin}</span>
                    <ArrowRight className="mx-4 h-5 w-5 text-primary" />
                    <span>{route.destination}</span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground space-y-1">
                      <p className="flex items-center"><Clock className="mr-2 h-4 w-4" />Departs: {new Date(route.departureTime).toLocaleString()}</p>
                      <p className="flex items-center"><BusIcon className="mr-2 h-4 w-4" />Bus: {bus.name}</p>
                  </div>
                </div>

                {/* Seat Selection & Pricing */}
                 <div className="p-4 rounded-lg border">
                    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                      <div className="flex items-center justify-between">
                          <div>
                              <h3 className="font-semibold">Your Seat(s)</h3>
                              <p className="text-sm text-muted-foreground">We've selected a seat for you. You can change it below.</p>
                          </div>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Change Seat
                              <ChevronsUpDown className="h-4 w-4 ml-2" />
                            </Button>
                          </CollapsibleTrigger>
                      </div>

                      <div className="font-bold text-primary text-lg my-2 flex flex-wrap gap-2">
                          {selectedSeats.length > 0 ? selectedSeats.map(s => <span key={s.id} className="bg-primary text-primary-foreground text-sm font-bold py-1 px-3 rounded-full">{s.id}</span>) : <span className="text-muted-foreground">No seat selected</span>}
                      </div>

                      <CollapsibleContent>
                        <SeatMap bus={bus} route={route} seats={seats} setSeats={setSeats} />
                      </CollapsibleContent>
                    </Collapsible>

                    <Separator className="my-4" />

                    <div className="space-y-4">
                        {applicableDiscountInfo && (
                            <div className="text-sm space-y-2 p-3 bg-green-100 dark:bg-green-900/50 rounded-md border border-green-300 dark:border-green-800">
                                <p className="font-bold text-green-700 dark:text-green-300 flex items-center gap-2">
                                    <Tag className="h-5 w-5"/>
                                    {applicableDiscountInfo.discount.name} Applied!
                                </p>
                                <Separator className="bg-green-300 dark:bg-green-800"/>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Original Price:</span>
                                    <span>${originalPrice.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                    <span className="text-green-600 dark:text-green-400">Discount ({applicableDiscountInfo.tier.percentage}%):</span>
                                    <span className="text-green-600 dark:text-green-400">-${discountAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center text-2xl font-bold pt-2">
                            <span>Total Price:</span>
                            <span className="text-primary">${totalPrice.toFixed(2)}</span>
                        </div>
                    </div>
                 </div>
              </div>
            </CardContent>
            <CardFooter>
                <Button size="lg" onClick={handleConfirmBooking} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={selectedSeats.length === 0}>
                    Confirm & Book
                </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
