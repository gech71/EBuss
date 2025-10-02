
"use client";

import { useRef } from "react";
import type { Booking, Route, Bus, Location, BookedSeat } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowRight, Bus as BusIcon, Clock, MapPin, User, Ticket as TicketIcon, Download, Send, MessageCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import html2canvas from "html2canvas";
import { Button } from "../ui/button";

type BookingWithDetails = Booking & {
  bookedSeats: BookedSeat[];
  route: (Route & {
    origin: Location;
    destination: Location;
    bus: Bus;
  }) | null; // Route can be null
};

interface TicketDisplayProps {
  booking: BookingWithDetails | null;
}

export function TicketDisplay({ booking }: TicketDisplayProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (ticketRef.current) {
      html2canvas(ticketRef.current, { useCORS: true }).then((canvas) => {
        const link = document.createElement("a");
        link.download = `NibTeraBuss-Ticket-${booking?.id}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      });
    }
  };

  if (!booking || !booking.route) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Ticket Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The requested ticket could not be found. The associated route may no longer exist, or the booking was not completed.</p>
        </CardContent>
      </Card>
    );
  }
  
  const { route } = booking;
  const { bus } = route;

  const qrCodeData = encodeURIComponent(JSON.stringify({ ticketId: booking.id, routeId: booking.routeId, passenger: booking.passengerName }));
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrCodeData}&bgcolor=F0F8FF`;
  const seatNumbers = booking.bookedSeats.map(s => s.seatNumber).join(', ');
  
  const shareText = `Check out my bus ticket from ${route.origin.name} to ${route.destination.name} on ${new Date(route.departureTime).toLocaleDateString()}!`;
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;

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
                        <p className="text-muted-foreground">Seat(s)</p>
                        <p className="font-semibold flex items-center gap-2"><TicketIcon className="h-4 w-4"/>{seatNumbers}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Departure</p>
                        <p className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4"/>{new Date(route.departureTime).toLocaleString()}</p>
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

        <Card className="mt-4">
            <CardContent className="p-4 flex justify-around items-center">
                 <Button variant="outline" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                </Button>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp
                    </Button>
                </a>
                 <a href={telegramUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                        <Send className="mr-2 h-4 w-4" />
                        Telegram
                    </Button>
                </a>
            </CardContent>
        </Card>
    </div>
  );
}
