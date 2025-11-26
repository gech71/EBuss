

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Image from 'next/image';
import { Loader2, Search, Ticket, ArrowRight, Bus as BusIcon, Clock, Building, CalendarIcon, Maximize, Smartphone } from 'lucide-react';
import type { Booking, Route, Bus, Location, BusOwner, BookedSeat } from '@prisma/client';
import { format, isSameDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

type EnrichedBooking = Booking & {
  route: Route & {
    origin: Location;
    destination: Location;
    bus: Bus & { owner: BusOwner };
  };
  bookedSeats: BookedSeat[];
};

interface MyTicketsClientPageProps {
    isMiniApp: boolean;
    phoneNumberFromSession?: string;
}

function TicketCard({ booking }: { booking: EnrichedBooking }) {
    const { route } = booking;
    const qrCodePayload = JSON.stringify({ ticketId: booking.id });
    const base64Payload = btoa(qrCodePayload);
    const qrCodeData = encodeURIComponent(base64Payload);

    return (
      <Dialog>
        <Card className="bg-background overflow-hidden">
            <div className="flex flex-col md:flex-row">
                <div className="flex-grow p-4">
                    <div className="flex justify-between items-start">
                        <div>
                             <CardTitle className="text-xl flex flex-col sm:flex-row sm:items-center gap-x-2 gap-y-1">
                                <span>{route.origin.name}</span>
                                <ArrowRight className="h-5 w-5 text-muted-foreground hidden sm:inline" />
                                <span>{route.destination.name}</span>
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                                <Building className="h-4 w-4" /> {route.bus.owner.name}
                            </CardDescription>
                        </div>
                        <Badge variant="secondary">{booking.status}</Badge>
                    </div>
                     <Separator className="my-3" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <div className="flex items-center gap-2 font-medium"><span>{booking.passengerName}</span></div>
                        <div className="flex items-center gap-2"><Ticket className="h-4 w-4 text-primary" /> <span>Seats: {booking.bookedSeats.map(s => s.seatNumber).join(', ')}</span></div>
                        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> <span>Depart: {format(new Date(route.departureTime), 'Pp')}</span></div>
                        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> <span>Arrive: {format(new Date(route.arrivalTime), 'Pp')}</span></div>
                        <div className="flex items-center gap-2 sm:col-span-2"><BusIcon className="h-4 w-4 text-primary" /> <span>{route.bus.name}</span></div>
                    </div>
                </div>
                 <DialogTrigger asChild>
                    <button className="bg-muted/40 p-4 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l relative group">
                        <Image 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${qrCodeData}&bgcolor=F0F8FF`} 
                            alt="Ticket QR Code" 
                            width={128} 
                            height={128}
                            className="rounded-md"
                            data-ai-hint="qr code"
                        />
                        <p className="text-xs text-muted-foreground mt-2">Scan at boarding</p>
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Maximize className="h-8 w-8 text-white" />
                        </div>
                    </button>
                 </DialogTrigger>
            </div>
        </Card>
        <DialogContent className="max-w-xs sm:max-w-sm">
            <DialogHeader>
                <DialogTitle>Scan QR Code</DialogTitle>
                <DialogDescription>
                    Present this QR code during boarding.
                </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center p-4">
                <Image 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrCodeData}&bgcolor=F0F8FF`} 
                    alt="Enlarged Ticket QR Code" 
                    width={300} 
                    height={300}
                    className="rounded-lg border-4 border-muted"
                    data-ai-hint="qr code"
                />
            </div>
        </DialogContent>
      </Dialog>
    );
}


export function MyTicketsClientPage({ isMiniApp, phoneNumberFromSession }: MyTicketsClientPageProps) {
    const [allBookings, setAllBookings] = useState<EnrichedBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState<Date | undefined>();

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/my-tickets`);
            if (response.ok) {
                const data = await response.json();
                setAllBookings(data);
            } else {
                setAllBookings([]);
            }
        } catch (error) {
            console.error("Failed to fetch tickets:", error);
            setAllBookings([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isMiniApp && phoneNumberFromSession) {
            fetchTickets();
        } else {
            setLoading(false);
        }
    }, [isMiniApp, phoneNumberFromSession, fetchTickets]);

    const filteredBookings = useMemo(() => {
        if (!filterDate) {
            return allBookings;
        }
        return allBookings.filter(booking => 
            isSameDay(new Date(booking.route.departureTime), filterDate)
        );
    }, [allBookings, filterDate]);
    
    const groupedBookings = filteredBookings.reduce((acc, booking) => {
        const date = format(new Date(booking.route.departureTime), 'yyyy-MM-dd');
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(booking);
        return acc;
    }, {} as Record<string, EnrichedBooking[]>);

    const sortedDates = Object.keys(groupedBookings).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="font-headline text-3xl">My Tickets</CardTitle>
                <CardDescription>View all your purchased and paid tickets here.</CardDescription>
            </CardHeader>
            <CardContent>
                {!isMiniApp && !loading && (
                    <Alert>
                        <Smartphone className="h-4 w-4" />
                        <AlertTitle>Secure Ticket Access</AlertTitle>
                        <AlertDescription>
                            For your security, ticket lookups are only available within the NibTera Super App. Please open the mini-app to view your tickets.
                        </AlertDescription>
                    </Alert>
                )}

                 {isMiniApp && (
                    <div className="flex items-center gap-4 mb-6">
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-full sm:w-[280px] justify-start text-left font-normal",
                                !filterDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filterDate ? format(filterDate, "PPP") : <span>Filter by date...</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={filterDate}
                                    onSelect={setFilterDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                         {filterDate && <Button variant="ghost" onClick={() => setFilterDate(undefined)}>Clear Filter</Button>}
                    </div>
                 )}
                
                {loading && <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}

                {!loading && isMiniApp && (
                     filteredBookings.length > 0 ? (
                        <Accordion type="multiple" defaultValue={sortedDates.map(date => `date-${date}`)} className="w-full">
                          {sortedDates.map(date => (
                            <AccordionItem key={date} value={`date-${date}`}>
                              <AccordionTrigger className="font-semibold text-lg">
                                Trips on {format(new Date(date), "PPP")}
                              </AccordionTrigger>
                              <AccordionContent className="space-y-4 pt-2">
                                {groupedBookings[date].map(booking => (
                                  <TicketCard key={booking.id} booking={booking} />
                                ))}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                    ) : (
                        <div className="text-center py-10">
                            <Ticket className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No Tickets Found</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {filterDate 
                                    ? `No paid tickets were found for your account on ${format(filterDate, "PPP")}.`
                                    : `No paid tickets were found for your account.`
                                }
                            </p>
                        </div>
                    )
                )}
            </CardContent>
        </Card>
    );
}
