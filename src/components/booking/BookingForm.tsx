
"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route, Bus, SeatLayout, Seat, Discount, DiscountTier, Location, DiscountType, TicketType } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Armchair, ArrowRight, Bus as BusIcon, Calendar, Clock, Percent, User, Users, XCircle, Info, Repeat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SeatMap } from "./SeatMap";
import { createBookingAction, createPaymentRequestAction } from "@/app/book/actions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useCsrf } from "@/hooks/useCsrf";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

type EnrichedDiscount = (Discount & { tiers: DiscountTier[]; percentage: number | null });

type RouteWithDetails = Route & {
    origin: Location;
    destination: Location;
    bus: Bus & { layout: SeatLayout & { seats: Seat[] } };
    discount: EnrichedDiscount | null;
};

type AlternativeRoute = Route & { bus: Bus };

interface BookingFormProps {
  route: RouteWithDetails;
  alternativeRoutes: AlternativeRoute[];
  authToken?: string;
  phoneNumber?: string;
}

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
  const { csrfToken, loading: csrfLoading } = useCsrf();

  const [selectedRoute, setSelectedRoute] = useState<RouteWithDetails>(initialRoute);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState(phoneNumber || "");
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnDate, setReturnDate] = useState<Date | undefined>();
  
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

  const { subtotal, discountAmount, finalPrice, appliedDiscountName, appliedDiscountValue } = useMemo(() => {
    const multiplier = isRoundTrip ? 2 : 1;
    const subtotal = selectedRoute.price * ticketCount * multiplier;
    let discountAmount = 0;
    let appliedDiscountName: string | null = null;
    let appliedDiscountValue: string | null = null;
    
    const now = new Date();
    const discount = selectedRoute.discount;

    const isDiscountActive = discount && 
                             now >= new Date(discount.startDate) && 
                             now <= new Date(discount.endDate);

    if (isDiscountActive && ticketCount > 0) {
        if (discount.type === 'DATE_BASED' && discount.percentage) {
            discountAmount = (subtotal * discount.percentage) / 100;
            appliedDiscountName = discount.name;
            appliedDiscountValue = `${discount.percentage}%`;
        } else if (discount.type === 'TICKET_COUNT_BASED') {
            const applicableTier = discount.tiers
                .filter(tier => ticketCount >= tier.minTickets && ticketCount <= tier.maxTickets)
                .sort((a, b) => Number(b.percentage) - Number(a.percentage))[0];
            
            if (applicableTier) {
                discountAmount = (subtotal * Number(applicableTier.percentage)) / 100;
                appliedDiscountName = discount.name;
                appliedDiscountValue = `${Number(applicableTier.percentage)}%`;
            }
        }
    }
    
    const finalPrice = subtotal - discountAmount;
    return { subtotal, discountAmount, finalPrice, appliedDiscountName, appliedDiscountValue };
  }, [ticketCount, selectedRoute, isRoundTrip]);

  const handleRouteChange = async (routeId: string) => {
    if (routeId === selectedRoute.id) return;
    
    const response = await fetch(`/api/route/${routeId}`);
    const newRouteDetails: RouteWithDetails = await response.json();

    setSelectedRoute(newRouteDetails);
    setSelectedSeats([]);
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
    
    const formData = new FormData(event.currentTarget);
    formData.append('routeId', selectedRoute.id);
    formData.append('selectedSeatNumbers', JSON.stringify(selectedSeats.map(s => s.seatNumber)));
    formData.append('totalPrice', finalPrice.toString());
    formData.append('passengerPhone', passengerPhone);

    startTransition(async () => {
      const result = await createBookingAction(formData);
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
        
        if (!authToken) {
            setShowConfirmation(true);
        } else {
             router.push(`/ticket/${result.bookingId}`);
        }

      } else {
        toast({ title: "Booking Failed", description: result.message, variant: "destructive" });
      }
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="csrfToken" value={csrfToken || ''} />
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-3xl">Confirm Your Booking</CardTitle>
            <CardDescription>Review your trip details and select your seats.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
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

            {selectedRoute.ticketType === 'ROUND_TRIP' && (
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2 mb-2"><Repeat /> Trip Type</h3>
                     <RadioGroup onValueChange={(value) => setIsRoundTrip(value === 'true')} defaultValue="false" className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="false" id="one_way" />
                            <Label htmlFor="one_way">One-Way</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true" id="round_trip" />
                            <Label htmlFor="round_trip">Round-Trip</Label>
                        </div>
                    </RadioGroup>
                    {isRoundTrip && (
                        <>
                            <Alert className="mt-4">
                                <Info className="h-4 w-4" />
                                <AlertTitle>Round-Trip Pricing</AlertTitle>
                                <AlertDescription>
                                    The total price will be double the one-way fare. Your return trip will be open-ended and can be booked later.
                                </AlertDescription>
                            </Alert>
                            <div className="mt-4 space-y-2">
                                <Label htmlFor="returnDate">Return Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !returnDate && "text-muted-foreground")} disabled>
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {returnDate ? format(returnDate, "PPP") : <span>Pick a return date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={returnDate} onSelect={setReturnDate} initialFocus disabled={{ before: new Date(selectedRoute.departureTime) }}/>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </>
                    )}
                </div>
            )}
            
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-2"><Armchair /> Select Your Seats</h3>
              {areSeatsAvailable ? (
                <SeatMap 
                  key={selectedRoute.id} 
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
            
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4"><User /> Passenger Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passengerName">Full Name</Label>
                  <Input id="passengerName" name="passengerName" placeholder="e.g., John Doe" required value={passengerName} onChange={e => setPassengerName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passengerPhone">Phone Number</Label>
                  <Input id="passengerPhone" name="passengerPhone" type="tel" placeholder="e.g., 0912345678" required value={passengerPhone} onChange={e => setPassengerPhone(e.target.value)} disabled={!!phoneNumber} />
                </div>
              </div>
            </div>

            <Separator />
            
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4"><span className="font-bold">ETB</span> Price Summary</h3>
              <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                  <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center gap-2"><Users />Tickets</span>
                      <span>{ticketCount} x {selectedRoute.price.toFixed(2)} ETB {isRoundTrip && <span className="font-bold text-primary">x 2</span>}</span>
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
                  {appliedDiscountName && (
                      <div className="flex justify-between items-center text-sm text-green-600 font-semibold">
                          <span className="flex items-center gap-2"><Percent />{appliedDiscountName} ({appliedDiscountValue})</span>
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
            
            <Button type="submit" size="lg" className="w-full" disabled={isPending || csrfLoading || ticketCount === 0 || !areSeatsAvailable}>
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
