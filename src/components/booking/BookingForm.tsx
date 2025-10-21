
"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Route, Bus, SeatLayout, Seat, Discount, DiscountTier, Location } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Armchair, ArrowRight, Bus as BusIcon, Calendar, Clock, DollarSign, Percent, User, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SeatMap } from "./SeatMap";
import { createBookingAction, createPaymentRequestAction } from "@/app/book/actions";

type RouteWithDetails = Route & {
    origin: Location;
    destination: Location;
    bus: Bus & { layout: SeatLayout & { seats: Seat[] } };
    discount: (Discount & { tiers: DiscountTier[] }) | null;
};

type AlternativeRoute = Route & { bus: Bus };

interface BookingFormProps {
  route: RouteWithDetails;
  alternativeRoutes: AlternativeRoute[];
}

export function BookingForm({ route: initialRoute, alternativeRoutes }: BookingFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [authToken, setAuthToken] = useState<string | undefined>();
  const [selectedRoute, setSelectedRoute] = useState<RouteWithDetails>(initialRoute);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [passengerName, setPassengerName] = useState("");
  const [passengerEmail, setPassengerEmail] = useState("");

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setAuthToken(urlToken);
    }
  }, [searchParams]);

  const ticketCount = selectedSeats.length;

  const { subtotal, discountAmount, finalPrice, appliedTier } = useMemo(() => {
    const subtotal = selectedRoute.price * ticketCount;
    let discountAmount = 0;
    let appliedTier: DiscountTier | null = null;

    if (selectedRoute.discount && ticketCount > 0) {
      const applicableTier = selectedRoute.discount.tiers
        .filter(tier => ticketCount >= tier.minTickets && ticketCount <= tier.maxTickets)
        .sort((a, b) => b.percentage - a.percentage)[0];
      
      if (applicableTier) {
        discountAmount = (subtotal * applicableTier.percentage) / 100;
        appliedTier = applicableTier;
      }
    }
    
    const finalPrice = subtotal - discountAmount;
    return { subtotal, discountAmount, finalPrice, appliedTier };
  }, [ticketCount, selectedRoute.price, selectedRoute.discount]);

  const handleRouteChange = async (routeId: string) => {
    if (routeId === selectedRoute.id) return;
    
    // Fetch full route details for the selected alternative
    const response = await fetch(`/api/route/${routeId}`);
    const newRouteDetails: RouteWithDetails = await response.json();

    setSelectedRoute(newRouteDetails);
    setSelectedSeats([]); // Reset seat selection when route changes
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedSeats.length === 0) {
      toast({ title: "No seats selected", description: "Please select at least one seat.", variant: "destructive" });
      return;
    }
    if (!passengerName || !passengerEmail) {
      toast({ title: "Passenger details required", description: "Please enter your name and email.", variant: "destructive" });
      return;
    }

    const bookingData = {
      routeId: selectedRoute.id,
      selectedSeatNumbers: selectedSeats.map(s => s.seatNumber),
      totalPrice: finalPrice,
      passengerName,
      passengerEmail
    };

    startTransition(async () => {
      const result = await createBookingAction(bookingData);
      if (result.success && result.bookingId) {
        toast({ title: "Booking Successful!", description: "Proceeding to payment..." });

        if (!authToken) {
            toast({ title: "Payment Error", description: "Mini-app authentication token not found.", variant: "destructive"});
            // Redirect to ticket page anyway so user is not stuck
            router.push(`/ticket/${result.bookingId}`);
            return;
        }

        const paymentResult = await createPaymentRequestAction(result.bookingId, finalPrice, authToken);

        if (paymentResult.success && paymentResult.paymentToken) {
            toast({ title: "Payment Initiated", description: "Please complete the payment on your device." });
            // Here you would typically use the `paymentToken` to trigger the mini-app's payment UI.
            // For now, we will just redirect to the ticket page.
            console.log("Received Payment Token:", paymentResult.paymentToken);
            // In a real mini-app, you might do something like:
            // window.myChannel.postMessage({ type: 'PAYMENT_REQUEST', token: paymentResult.paymentToken });
            router.push(`/ticket/${result.bookingId}`);
        } else {
            toast({ title: "Payment Initiation Failed", description: paymentResult.message, variant: "destructive" });
            router.push(`/ticket/${result.bookingId}`);
        }

      } else {
        toast({ title: "Booking Failed", description: result.message, variant: "destructive" });
        // Optionally, refetch route data to show which seats are gone
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Confirm Your Booking</CardTitle>
          <CardDescription>Review your trip details and select your seats.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Route Details */}
          <div className="p-4 border rounded-lg bg-muted/30">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-4 text-xl font-bold">
                    <span>{selectedRoute.origin.name}</span>
                    <ArrowRight className="h-5 w-5 text-primary" />
                    <span>{selectedRoute.destination.name}</span>
                </div>
                 {alternativeRoutes.length > 1 && (
                    <Select onValueChange={handleRouteChange} defaultValue={selectedRoute.id}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Change bus..." />
                        </SelectTrigger>
                        <SelectContent>
                        {alternativeRoutes.map(altRoute => (
                            <SelectItem key={altRoute.id} value={altRoute.id}>
                                {altRoute.bus.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                 )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-4 text-muted-foreground">
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> <span>{new Date(selectedRoute.departureTime).toLocaleDateString()}</span></div>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> <span>{new Date(selectedRoute.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                <div className="flex items-center gap-2"><BusIcon className="h-4 w-4" /> <span>{selectedRoute.bus.name}</span></div>
            </div>
          </div>
          
          {/* Seat Map */}
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-2"><Armchair /> Select Your Seats</h3>
            <SeatMap 
              key={selectedRoute.id} // Add key to force re-render on route change
              bus={selectedRoute.bus} 
              onSelectionChange={setSelectedSeats} 
            />
          </div>

          <Separator />
          
          {/* Passenger Info */}
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4"><User /> Passenger Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="passengerName">Full Name</Label>
                <Input id="passengerName" placeholder="e.g., John Doe" required value={passengerName} onChange={e => setPassengerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passengerEmail">Email Address</Label>
                <Input id="passengerEmail" type="email" placeholder="e.g., john.doe@example.com" required value={passengerEmail} onChange={e => setPassengerEmail(e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />
          
          {/* Price Summary */}
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4"><DollarSign /> Price Summary</h3>
            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-2"><Users />Tickets</span>
                    <span>{ticketCount} x ${selectedRoute.price.toFixed(2)}</span>
                </div>
                {ticketCount > 0 && (
                  <div className="flex justify-between items-start text-sm">
                      <span className="text-muted-foreground flex items-center gap-2 pt-1"><Armchair />Selected Seats</span>
                      <span className="font-semibold text-right max-w-[50%]">{selectedSeats.map(s => s.seatNumber).join(', ')}</span>
                  </div>
                )}
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                </div>
                {appliedTier && (
                    <div className="flex justify-between items-center text-sm text-green-600 font-semibold">
                        <span className="flex items-center gap-2"><Percent />{selectedRoute.discount?.name} ({appliedTier.percentage}%)</span>
                        <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                )}
                <Separator className="my-2" />
                 <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total Price</span>
                    <span>${finalPrice.toFixed(2)}</span>
                </div>
            </div>
          </div>
          
          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending ? 'Processing...' : 'Book Now & Pay'}
          </Button>

        </CardContent>
      </Card>
    </form>
  );
}
