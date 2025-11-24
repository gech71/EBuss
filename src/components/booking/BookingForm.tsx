
"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route, Bus, SeatLayout, Seat, Discount, DiscountTier, Location, DiscountType, TicketType, DiscountValueType } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Armchair, ArrowRight, Bus as BusIcon, Calendar as CalendarIcon, Clock, Percent, User, Users, XCircle, Info, Repeat, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SeatMap } from "./SeatMap";
import { createBookingAction, createPaymentRequestAction, releaseExpiredBookingsForRoutes } from "@/app/book/actions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useCsrf } from "@/hooks/useCsrf";
import { format, isSameDay } from "date-fns";
import { formatInTimeZone, toDate, fromZonedTime } from 'date-fns-tz';
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { BackButton } from "../BackButton";

type EnrichedDiscount = (Discount & { tiers: DiscountTier[]; percentage: number | null });

type RouteWithDetails = Route & {
    origin: Location;
    destination: Location;
    bus: Bus & { layout: SeatLayout & { seats: Seat[] } };
    discount: EnrichedDiscount | null;
    roundTripDiscountValue: number | null;
    roundTripDiscountType: DiscountValueType | null;
};

type AlternativeRoute = Route & { bus: Bus };

type ReturnRoute = Route & { 
    price: number;
    bus: Bus & { 
        owner: { name: string },
        layout: SeatLayout & { seats: Seat[] } 
    } 
};

type SimpleReturnRoute = {
  departureTime: string;
}


interface BookingFormProps {
  route: RouteWithDetails;
  alternativeRoutes: AlternativeRoute[];
  potentialReturnRoutes: SimpleReturnRoute[];
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

export function BookingForm({ route: initialRoute, alternativeRoutes, potentialReturnRoutes, authToken, phoneNumber }: BookingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { csrfToken, loading: csrfLoading } = useCsrf();

  const [selectedRoute, setSelectedRoute] = useState<RouteWithDetails>(initialRoute);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [selectedReturnSeats, setSelectedReturnSeats] = useState<Seat[]>([]);
  
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState(phoneNumber || "");
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnDate, setReturnDate] = useState<Date | undefined>();
  
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showWebPaymentAlert, setShowWebPaymentAlert] = useState(false);
  const [lastBookingId, setLastBookingId] = useState<string | null>(null);

  const [isSearchingReturn, setIsSearchingReturn] = useState(false);
  const [returnRoutes, setReturnRoutes] = useState<ReturnRoute[]>([]);
  const [selectedReturnRoute, setSelectedReturnRoute] = useState<ReturnRoute | null>(null);
  const [noReturnTripsFound, setNoReturnTripsFound] = useState(false);


  const availableReturnDates = useMemo(() => {
    const timeZone = 'UTC';
    const uniqueDates = new Set<string>();
    potentialReturnRoutes.forEach(route => {
        const zonedDate = fromZonedTime(route.departureTime, timeZone);
        const startOfDayStr = format(zonedDate, 'yyyy-MM-dd');
        uniqueDates.add(startOfDayStr);
    });

    return Array.from(uniqueDates).map(dateStr => {
        return toDate(`${dateStr}T00:00:00Z`); // Create date object from UTC string
    });
  }, [potentialReturnRoutes]);


  useEffect(() => {
    if(phoneNumber) {
        setPassengerPhone(phoneNumber);
    }
  }, [phoneNumber])

  const areSeatsAvailable = useMemo(() => {
    return selectedRoute.bus.layout.seats.some(seat => seat.status === 'AVAILABLE');
  }, [selectedRoute]);
  
  const areReturnSeatsAvailable = useMemo(() => {
    if (!selectedReturnRoute) return false;
    return selectedReturnRoute.bus.layout.seats.some(seat => seat.status === 'AVAILABLE');
  }, [selectedReturnRoute]);


  const handleReturnDateSelect = async (date: Date) => {
      setReturnDate(date);
      setIsSearchingReturn(true);
      setReturnRoutes([]);
      setSelectedReturnRoute(null);
      setSelectedReturnSeats([]);
      setNoReturnTripsFound(false);

      try {
          const dateInUtc = formatInTimeZone(date, 'UTC', 'yyyy-MM-dd');
          const searchUrl = `/api/routes/search?originId=${selectedRoute.destinationId}&destinationId=${selectedRoute.originId}&date=${dateInUtc}`;
          
          // Step 1: Fetch potential routes to get their IDs
          const initialResponse = await fetch(searchUrl);
          const potentialRoutes = await initialResponse.json();

          if (!initialResponse.ok || potentialRoutes.length === 0) {
              setNoReturnTripsFound(true);
              setIsSearchingReturn(false);
              return;
          }
          
          // Step 2: Call action to clean up expired seats for these routes
          const routeIds = potentialRoutes.map((r: Route) => r.id);
          await releaseExpiredBookingsForRoutes(routeIds);

          // Step 3: Fetch the routes again to get fresh seat data
          const finalResponse = await fetch(searchUrl);
          const finalData = await finalResponse.json();

          if (finalResponse.ok) {
              setReturnRoutes(finalData);
               if (finalData.length === 0) {
                 setNoReturnTripsFound(true);
              }
          } else {
              toast({ title: "Search Failed", description: finalData.message, variant: "destructive" });
          }
      } catch (error) {
           toast({ title: "Search Error", description: "Could not fetch return trips. Please try again.", variant: "destructive" });
      } finally {
          setIsSearchingReturn(false);
      }
  };


  const { subtotal, discountAmount, finalPrice, appliedDiscounts } = useMemo(() => {
    const outboundSeats = selectedSeats.length;
    const returnSeats = selectedReturnSeats.length;

    const outboundPrice = selectedRoute.price * outboundSeats;
    const returnPrice = selectedReturnRoute ? selectedReturnRoute.price * returnSeats : 0;
    
    let subtotal = outboundPrice + returnPrice;

    let totalDiscountAmount = 0;
    let appliedDiscountParts: { name: string; value: string; amount: number }[] = [];
    
    const now = new Date();
    const discount = selectedRoute.discount;

    const ticketCountForDiscount = isRoundTrip ? outboundSeats + returnSeats : outboundSeats;

    const isDiscountActive = discount && 
                             now >= new Date(discount.startDate) && 
                             now <= new Date(discount.endDate);

    if (isDiscountActive && ticketCountForDiscount > 0) {
        let generalDiscountAmount = 0;
        if (discount.type === 'DATE_BASED' && discount.percentage) {
            generalDiscountAmount = (subtotal * discount.percentage) / 100;
            appliedDiscountParts.push({ name: discount.name, value: `${discount.percentage}%`, amount: generalDiscountAmount });
        } else if (discount.type === 'TICKET_COUNT_BASED') {
            const applicableTier = discount.tiers
                .filter(tier => ticketCountForDiscount >= tier.minTickets && ticketCountForDiscount <= tier.maxTickets)
                .sort((a, b) => Number(b.percentage) - Number(a.percentage))[0];
            
            if (applicableTier) {
                generalDiscountAmount = (subtotal * Number(applicableTier.percentage)) / 100;
                appliedDiscountParts.push({ name: discount.name, value: `${Number(applicableTier.percentage)}%`, amount: generalDiscountAmount });
            }
        }
        totalDiscountAmount += generalDiscountAmount;
    }
    
    if (isRoundTrip && selectedReturnRoute && selectedRoute.roundTripDiscountValue) {
        const roundTripDiscountValue = selectedRoute.roundTripDiscountValue;
        let roundTripDiscountAmount = 0;
        // Calculate the discount on the subtotal *after* any general discount has been applied
        const baseForRoundTripDiscount = subtotal - totalDiscountAmount;

        if (selectedRoute.roundTripDiscountType === 'PERCENTAGE') {
            roundTripDiscountAmount = (baseForRoundTripDiscount * roundTripDiscountValue) / 100;
            appliedDiscountParts.push({ name: 'Round Trip Offer', value: `${roundTripDiscountValue}%`, amount: roundTripDiscountAmount });
        } else if (selectedRoute.roundTripDiscountType === 'FIXED') {
            roundTripDiscountAmount = roundTripDiscountValue;
             appliedDiscountParts.push({ name: 'Round Trip Offer', value: `${roundTripDiscountValue} ETB`, amount: roundTripDiscountAmount });
        }
        totalDiscountAmount += roundTripDiscountAmount;
    }
    
    const finalPrice = subtotal - totalDiscountAmount;

    return { subtotal, discountAmount: totalDiscountAmount, finalPrice, appliedDiscounts: appliedDiscountParts };
  }, [selectedSeats, selectedReturnSeats, selectedRoute, isRoundTrip, selectedReturnRoute]);

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
      toast({ title: "No seats selected", description: "Please select seats for the outbound trip.", variant: "destructive" });
      return;
    }
    if (isRoundTrip && !selectedReturnRoute) {
        toast({ title: "Return trip required", description: "Please select a return trip.", variant: "destructive" });
        return;
    }
    if (isRoundTrip && selectedReturnSeats.length === 0) {
        toast({ title: "No return seats selected", description: "Please select seats for the return trip.", variant: "destructive" });
        return;
    }
     if (isRoundTrip && selectedSeats.length !== selectedReturnSeats.length) {
        toast({ title: "Seat Count Mismatch", description: "The number of seats for outbound and return trips must be the same.", variant: "destructive" });
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
    formData.append('isRoundTrip', String(isRoundTrip));
    formData.append('totalPrice', finalPrice.toString());
    formData.append('passengerName', passengerName);
    formData.append('passengerPhone', passengerPhone);

    const outboundData = {
        routeId: selectedRoute.id,
        selectedSeatNumbers: selectedSeats.map(s => s.seatNumber)
    };
    formData.append('outboundTrip', JSON.stringify(outboundData));
    
    if (isRoundTrip && selectedReturnRoute) {
        const returnData = {
            routeId: selectedReturnRoute.id,
            selectedSeatNumbers: selectedReturnSeats.map(s => s.seatNumber)
        };
        formData.append('returnTrip', JSON.stringify(returnData));
    }


    startTransition(async () => {
      const result = await createBookingAction(formData);
      if (result.success && result.bookingId && result.finalPrice) {
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

        const paymentResult = await createPaymentRequestAction(result.bookingId, result.finalPrice, authToken);

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
            <div className="flex items-start justify-between">
                <div>
                    <CardTitle className="font-headline text-3xl">Confirm Your Booking</CardTitle>
                    <CardDescription>Review your trip details and select your seats.</CardDescription>
                </div>
                <BackButton />
            </div>
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
                  <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> <span>{new Date(selectedRoute.departureTime).toLocaleDateString()}</span></div>
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> <span>{new Date(selectedRoute.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                  <div className="flex items-center gap-2"><BusIcon className="h-4 w-4" /> <span>{selectedRoute.bus.name}</span></div>
              </div>
            </div>

            {selectedRoute.ticketType === 'ROUND_TRIP' && (
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><Repeat /> Trip Type</h3>
                     <RadioGroup onValueChange={(value) => {
                         setIsRoundTrip(value === 'true');
                         if (value === 'false') {
                             setReturnDate(undefined);
                             setReturnRoutes([]);
                             setSelectedReturnRoute(null);
                         }
                     }} defaultValue="false" className="flex gap-4">
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
                        <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                             <div className="space-y-2">
                                <Label>Select Return Date</Label>
                                 {availableReturnDates.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {availableReturnDates.map(date => (
                                        <Button 
                                            key={date.toISOString()} 
                                            type="button" 
                                            variant={returnDate && isSameDay(date, returnDate) ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => handleReturnDateSelect(date)}
                                        >
                                            {format(date, 'MMM d, yyyy')}
                                        </Button>
                                        ))}
                                    </div>
                                ) : (
                                     <Alert variant="destructive">
                                        <Info className="h-4 w-4" />
                                        <AlertTitle>No Return Dates Available</AlertTitle>
                                        <AlertDescription>
                                            There are no return trips scheduled for this route yet.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                            
                            {isSearchingReturn && (
                                <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary"/>
                                </div>
                            )}

                            {!isSearchingReturn && returnRoutes.length > 0 && (
                                 <div className="space-y-2">
                                    <Label>Select Return Trip</Label>
                                    <RadioGroup 
                                        onValueChange={(id) => setSelectedReturnRoute(returnRoutes.find(r => r.id === id) || null)} 
                                        className="space-y-2"
                                    >
                                        {returnRoutes.map(route => (
                                            <Label key={route.id} htmlFor={route.id} className="flex items-start gap-4 p-3 border rounded-md cursor-pointer hover:bg-muted has-[input:checked]:bg-primary has-[input:checked]:text-primary-foreground has-[input:checked]:border-primary">
                                                <RadioGroupItem value={route.id} id={route.id} className="border-muted-foreground mt-1" />
                                                <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                                                    <div className="sm:col-span-1">
                                                        <div className="font-semibold">{route.bus.owner.name}</div>
                                                        <div className="text-xs text-muted-foreground">{route.bus.name}</div>
                                                    </div>
                                                    <div className="font-medium sm:col-span-2">
                                                        {format(new Date(route.departureTime), "MMM d, yyyy (p)")}
                                                        <ArrowRight className="inline h-3 w-3 mx-1" />
                                                        {format(new Date(route.arrivalTime), "p")}
                                                    </div>
                                                    <div className="font-bold text-base text-right col-span-full sm:col-start-3 sm:row-start-1">{Number(route.price).toFixed(2)} ETB</div>
                                                </div>
                                            </Label>
                                        ))}
                                    </RadioGroup>
                                </div>
                            )}

                            {!isSearchingReturn && noReturnTripsFound && (
                                 <Alert variant="destructive">
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>No Return Trips Found</AlertTitle>
                                    <AlertDescription>
                                        There are no available trips for the selected return date.
                                    </AlertDescription>
                                </Alert>
                            )}

                        </div>
                    )}
                </div>
            )}
            
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-2"><Armchair /> Select Your Seats (Outbound)</h3>
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

            {isRoundTrip && selectedReturnRoute && (
                 <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2 mb-2"><Armchair /> Select Your Seats (Return)</h3>
                    {areReturnSeatsAvailable ? (
                        <SeatMap 
                            key={selectedReturnRoute.id} 
                            bus={selectedReturnRoute.bus} 
                            onSelectionChange={setSelectedReturnSeats} 
                        />
                    ) : (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertTitle>No Seats Available</AlertTitle>
                            <AlertDescription>
                                This return bus is fully booked. Please select another time or date.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )}

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
                      <span className="text-muted-foreground flex items-center gap-2"><ArrowRight />Outbound Tickets</span>
                      <span>{selectedSeats.length} x {selectedRoute.price.toFixed(2)} ETB</span>
                  </div>
                  {isRoundTrip && selectedReturnRoute && (
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-2"><ArrowRight className="transform -scale-x-100" />Return Tickets</span>
                        <span>{selectedReturnSeats.length} x {selectedReturnRoute.price.toFixed(2)} ETB</span>
                    </div>
                  )}
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{subtotal.toFixed(2)} ETB</span>
                  </div>
                   {appliedDiscounts.map((discount, index) => (
                      <div key={index} className="flex justify-between items-center text-sm text-green-600 font-semibold">
                          <span className="flex items-center gap-2"><Percent />{discount.name} ({discount.value})</span>
                          <span>-{discount.amount.toFixed(2)} ETB</span>
                      </div>
                  ))}
                  <Separator className="my-2" />
                   <div className="flex justify-between items-center font-bold text-lg">
                      <span>Total Price</span>
                      <span>{finalPrice.toFixed(2)} ETB</span>
                  </div>
              </div>
            </div>
            
            {isRoundTrip && selectedSeats.length > 0 && selectedReturnSeats.length > 0 && selectedSeats.length !== selectedReturnSeats.length && (
                <Alert variant="destructive">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Seat Count Mismatch</AlertTitle>
                    <AlertDescription>
                        Please select the same number of seats for the outbound and return trips. You have selected {selectedSeats.length} outbound and {selectedReturnSeats.length} return seats.
                    </AlertDescription>
                </Alert>
            )}

            <Button 
                type="submit" 
                size="lg" 
                className="w-full" 
                disabled={
                    isPending || 
                    csrfLoading || 
                    selectedSeats.length === 0 || 
                    !areSeatsAvailable || 
                    (isRoundTrip && (!selectedReturnRoute || selectedReturnSeats.length === 0 || !areReturnSeatsAvailable)) ||
                    (isRoundTrip && availableReturnDates.length === 0) ||
                    (isRoundTrip && selectedSeats.length !== selectedReturnSeats.length)
                }
            >
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
