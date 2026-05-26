

"use client";

import { useRef } from "react";
import type { Booking, Route, Bus, Location, Ticket } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowRight, Bus as BusIcon, Clock, MapPin, User, Ticket as TicketIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { formatRouteDateTime } from "@/lib/route-time";

type EnrichedTicket = Ticket & {
  route: Route & {
    origin: Location;
    destination: Location;
    bus: Bus;
  };
};

type BookingWithTickets = Booking & {
    tickets: EnrichedTicket[];
}


interface TicketDisplayProps {
  booking: BookingWithTickets;
  ticket: EnrichedTicket;
}

export function TicketDisplay({ booking, ticket }: TicketDisplayProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  if (!booking || !ticket || !ticket.route) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Ticket Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The requested ticket could not be found.</p>
        </CardContent>
      </Card>
    );
  }
  
  const { route } = ticket;
  const { bus } = route;

  const qrCodePayload = JSON.stringify({ ticketId: ticket.id });
  const base64Payload = btoa(qrCodePayload);
  const qrCodeData = encodeURIComponent(base64Payload);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrCodeData}&bgcolor=F0F8FF`;
  
  return (
    <div className="w-full max-w-md">
        <Card ref={ticketRef} className="bg-card shadow-2xl rounded-lg overflow-hidden">
            <CardHeader className="bg-primary text-primary-foreground p-6">
                <CardTitle className="font-headline text-3xl">Boarding Pass</CardTitle>
                <CardDescription className="text-primary-foreground/80">Your ticket for NibTeraBuss</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-center">
                    <Image 
                        src={qrCodeUrl} 
                        alt="Ticket QR Code" 
                        width={200} 
                        height={200}
                        className="rounded-lg border-4 border-muted"
                        data-ai-hint="qr code"
                    />
                </div>
                <Separator />
                <div className="flex items-center justify-between text-lg font-semibold">
                <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary"/>
                    <span>{route.origin.name}</span>
                </div>
                <ArrowRight className="h-6 w-6 text-muted-foreground" />
                <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary"/>
                    <span>{route.destination.name}</span>
                </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Passenger</p>
                        <p className="font-semibold flex items-center gap-2"><User className="h-4 w-4"/>{booking.passengerName}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Seat</p>
                        <p className="font-semibold flex items-center gap-2"><TicketIcon className="h-4 w-4"/>{ticket.seatNumber}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Departure</p>
                        <p className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4"/>{formatRouteDateTime(route.departureTime, "MMM d, yyyy h:mm a")}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Bus</p>
                        <p className="font-semibold flex items-center gap-2"><BusIcon className="h-4 w-4"/>{bus.name}</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground text-center w-full">Please have this QR code ready for scanning before boarding. Thank you for choosing NibTeraBuss!</p>
            </CardFooter>
        </Card>
    </div>
  );
}
