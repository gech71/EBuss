
"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route, Bus, SeatLayout, Seat, Discount, DiscountTier, Location } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Armchair, ArrowRight, Bus as BusIcon, Calendar, Clock, Percent, User, Users, XCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SeatMap } from "./SeatMap";
import { createBookingAction, createPaymentRequestAction } from "@/app/book/actions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

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
  authToken?: string;
  phoneNumber?: string;
}

// For Mini App communication
declare global {
    interface Window {
        myJsChannel?: {
            postMessage: (message: { token: string }) => void;
        };
    }
}

export function BookingForm({ route: initialRoute, alternativeRoutes, authToken, phoneNumber }: BookingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [selectedRoute, setSelectedRoute] = useState<RouteWithDetails>(initialRoute);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState(phoneNumber || "");
  
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showWebPaymentAlert, setShowWebPaymentAlert] = useState(false);
  const [lastBookingId, setLastBookingId] = useState<string | null>(null);

  useEffect(() => {
    if(phoneNumber) {
        setPassengerPhone(phoneNumber);
    }
  }, [phoneNumber])

  const areSeatsAvailable = useMemo(() => {
    return selectedRoute.bus.layout.seats.some(seat => seat.status === 'AVAILABLE');
  }, [selectedRoute]);


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
    if (!passengerName || !passengerPhone) {
      toast({ title: "Passenger details required", description: "Please enter your name and phone number.", variant: "destructive" });
      return;
    }

    if (!authToken) {
        setShowWebPaymentAlert(true);
        return;
    }

    const bookingData = {
      routeId: selectedRoute.id,
      selectedSeatNumbers: selectedSeats.map(s => s.seatNumber),
      totalPrice: finalPrice,
      passengerName,
      passengerPhone
    };

    startTransition(async () => {
      const result = await createBookingAction(bookingData);
      if (result.success && result.bookingId) {
        setLastBookingId(result.bookingId);
        if (typeof window !== 'undefined') {
            localStorage.setItem('lastBookingId', result.bookingId);
        }
        toast({ title: "Booking Successful!", description: "Please complete the payment process." });

        if (!authToken) {
            toast({ title: "Payment Skipped", description: "Mini-app authentication token not found. Cannot initiate payment.", variant: "destructive"});
            setShowConfirmation(true);
            return;
        }

        const paymentResult = await createPaymentRequestAction(result.bookingId, finalPrice, authToken);

        if (paymentResult.success && paymentResult.paymentToken) {
             if (typeof window !== 'undefined' && window.myJsChannel?.postMessage) {
                window.myJsChannel.postMessage({ token: paymentResult.paymentToken });
                toast({ title: "Payment Initiated", description: "Please complete the payment on your device." });
             } else {
                console.error("NIB Super App channel (window.myJsChannel) not found.");
                toast({ title: "Payment Channel Error", description: "Could not communicate with the payment app.", variant: "destructive" });
             }
        } else {
            toast({ title: "Payment Initiation Failed", description: paymentResult.message, variant: "destructive" });
        }
        
        // Instead of showing a dialog, we let the user be redirected back to the home page, where the TicketRedirector will handle it.
        // For non-superapp flows, they can click a button to view their ticket.
        if (!authToken) {
            setShowConfirmation(true);
        } else {
            // In the super-app, the user will be taken away to the payment screen.
            // When they return, the TicketRedirector on the homepage will take them to the ticket.
        }

      } else {
        toast({ title: "Booking Failed", description: result.message, variant: "destructive" });
      }
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-3xl">Confirm Your Booking</CardTitle>
            <CardDescription>Review your trip details and select your seats.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Route Details */}
            <div className="p-4 border rounded-lg bg-muted/30">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-2 md:gap-4 text-lg md:text-xl font-bold">
                      <span className="truncate">{selectedRoute.origin.name}</span>
                      <ArrowRight className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="truncate">{selectedRoute.destination.name}</span>
                  </div>
                   {alternativeRoutes.length > 1 && (
                      <Select onValueChange={handleRouteChange} defaultValue={selectedRoute.id}>
                          <SelectTrigger className="w-full sm:w-[200px]">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm mt-4 text-muted-foreground">
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> <span>{new Date(selectedRoute.departureTime).toLocaleDateString()}</span></div>
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> <span>{new Date(selectedRoute.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                  <div className="flex items-center gap-2"><BusIcon className="h-4 w-4" /> <span>{selectedRoute.bus.name}</span></div>
              </div>
            </div>
            
            {/* Seat Map */}
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-2"><Armchair /> Select Your Seats</h3>
              {areSeatsAvailable ? (
                <SeatMap 
                  key={selectedRoute.id} // Add key to force re-render on route change
                  bus={selectedRoute.bus} 
                  onSelectionChange={setSelectedSeats} 
                />
              ) : (
                <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>No Seats Available</AlertTitle>
                    <AlertDescription>
                        Unfortunately, this bus is fully booked. Please select another bus or time.
                    </AlertDescription>
                </Alert>
              )}
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
                  <Label htmlFor="passengerPhone">Phone Number</Label>
                  <Input id="passengerPhone" type="tel" placeholder="e.g., 0912345678" required value={passengerPhone} onChange={e => setPassengerPhone(e.target.value)} disabled={!!phoneNumber} />
                </div>
              </div>
            </div>

            <Separator />
            
            {/* Price Summary */}
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4"><span className="font-bold">ETB</span> Price Summary</h3>
              <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                  <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center gap-2"><Users />Tickets</span>
                      <span>{ticketCount} x {selectedRoute.price.toFixed(2)} ETB</span>
                  </div>
                  {ticketCount > 0 && (
                    <div className="flex justify-between items-start text-sm">
                        <span className="text-muted-foreground flex items-center gap-2 pt-1"><Armchair />Selected Seats</span>
                        <span className="font-semibold text-right max-w-[50%]">{selectedSeats.map(s => s.seatNumber).join(', ')}</span>
                    </div>
                  )}
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{subtotal.toFixed(2)} ETB</span>
                  </div>
                  {appliedTier && (
                      <div className="flex justify-between items-center text-sm text-green-600 font-semibold">
                          <span className="flex items-center gap-2"><Percent />{selectedRoute.discount?.name} ({appliedTier.percentage}%)</span>
                          <span>-{discountAmount.toFixed(2)} ETB</span>
                      </div>
                  )}
                  <Separator className="my-2" />
                   <div className="flex justify-between items-center font-bold text-lg">
                      <span>Total Price</span>
                      <span>{finalPrice.toFixed(2)} ETB</span>
                  </div>
              </div>
            </div>
            
            <Button type="submit" size="lg" className="w-full" disabled={isPending || ticketCount === 0 || !areSeatsAvailable}>
              {isPending ? 'Processing...' : 'Book Now & Pay'}
            </Button>

          </CardContent>
        </Card>
      </form>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Booking Confirmed!</AlertDialogTitle>
            <AlertDialogDescription>
              Your seats are reserved. You can view your ticket status now, but the QR code will only be available after successful payment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => {
                setShowConfirmation(false);
                window.location.reload();
            }}>
              New Booking
            </Button>
            <Button onClick={() => router.push(`/ticket/${lastBookingId}`)}>
              View Ticket Status
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showWebPaymentAlert} onOpenChange={setShowWebPaymentAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Payment Information
            </AlertDialogTitle>
            <AlertDialogDescription>
              Thank you for your interest! Currently, our payment system is exclusively available through the <strong>NibTera Super App</strong>.<br />
              Web-based payments are coming soon. Please complete your booking and payment using the <strong>Mini App</strong> section of the <strong>NibTera Super App</strong> for now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowWebPaymentAlert(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
