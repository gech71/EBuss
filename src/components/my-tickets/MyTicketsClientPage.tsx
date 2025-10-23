
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Image from 'next/image';
import { Loader2, Search, Ticket, ArrowRight, Bus as BusIcon, Clock, Building } from 'lucide-react';
import type { Booking, Route, Bus, Location, BusOwner, BookedSeat } from '@prisma/client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
    const qrCodeData = encodeURIComponent(JSON.stringify({ ticketId: booking.id }));

    return (
        <Card className="bg-background overflow-hidden">
            <div className="flex flex-col md:flex-row">
                <div className="flex-grow p-4">
                    <div className="flex justify-between items-start">
                        <div>
                             <CardTitle className="text-xl flex items-center gap-2">
                                <span>{route.origin.name}</span>
                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                <span>{route.destination.name}</span>
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                                <Building className="h-4 w-4" /> {route.bus.owner.name}
                            </CardDescription>
                        </div>
                        <Badge variant="secondary">{booking.status}</Badge>
                    </div>
                     <Separator className="my-3" />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="flex items-center gap-2"><span>{booking.passengerName}</span></div>
                        <div className="flex items-center gap-2"><Ticket className="h-4 w-4 text-primary" /> <span>Seats: {booking.bookedSeats.map(s => s.seatNumber).join(', ')}</span></div>
                        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> <span>{format(new Date(route.departureTime), 'p')}</span></div>
                        <div className="flex items-center gap-2"><BusIcon className="h-4 w-4 text-primary" /> <span>{route.bus.name}</span></div>
                    </div>
                </div>
                 <div className="bg-muted/40 p-4 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l">
                    <Image 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${qrCodeData}&bgcolor=F0F8FF`} 
                        alt="Ticket QR Code" 
                        width={128} 
                        height={128}
                        className="rounded-md"
                        data-ai-hint="qr code"
                    />
                     <p className="text-xs text-muted-foreground mt-2">Scan at boarding</p>
                </div>
            </div>
        </Card>
    );
}


export function MyTicketsClientPage({ isMiniApp, phoneNumberFromSession }: MyTicketsClientPageProps) {
    const [phoneNumber, setPhoneNumber] = useState(phoneNumberFromSession || '');
    const [searchedPhone, setSearchedPhone] = useState('');
    const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasSearched, setHasSearched] = useState(false);

    const fetchTickets = useCallback(async (phone: string) => {
        if (!phone) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setHasSearched(true);
        setSearchedPhone(phone);
        try {
            const response = await fetch(`/api/my-tickets?phone=${encodeURIComponent(phone)}`);
            if (response.ok) {
                const data = await response.json();
                setBookings(data);
            } else {
                setBookings([]);
            }
        } catch (error) {
            console.error("Failed to fetch tickets:", error);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isMiniApp && phoneNumberFromSession) {
            fetchTickets(phoneNumberFromSession);
        } else {
            setLoading(false);
        }
    }, [isMiniApp, phoneNumberFromSession, fetchTickets]);
    
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchTickets(phoneNumber);
    };
    
    const groupedBookings = bookings.reduce((acc, booking) => {
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
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-end gap-4 mb-8 p-4 border rounded-lg bg-background">
                     <div className="space-y-2 flex-grow w-full">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input 
                            id="phone" 
                            type="tel" 
                            placeholder="Enter your phone number..." 
                            value={phoneNumber} 
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            disabled={isMiniApp}
                        />
                    </div>
                    <Button type="submit" className="w-full sm:w-auto" disabled={loading || !phoneNumber || isMiniApp}>
                        <Search className="mr-2 h-4 w-4" />
                        {loading ? "Searching..." : "Find My Tickets"}
                    </Button>
                </form>
                
                {loading && <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}

                {!loading && hasSearched && (
                     bookings.length > 0 ? (
                        <Accordion type="multiple" defaultValue={sortedDates.map(date => `date-${date}`)} className="w-full">
                          {sortedDates.map(date => (
                            <AccordionItem key={date} value={`date-${date}`}>
                              <AccordionTrigger className="font-semibold text-lg">
                                Trips on {format(new Date(date), "PPP")}
                              </AccordionTrigger>
                              <AccordionContent className="space-y-4">
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
                                No paid tickets were found for the phone number <span className="font-semibold">{searchedPhone}</span>.
                            </p>
                        </div>
                    )
                )}
                {!loading && !hasSearched && (
                     <div className="text-center py-10">
                        <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">Search for your tickets</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Enter your phone number above to retrieve your booking history.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
