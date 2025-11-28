
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Ticket } from "lucide-react";
import { Badge } from "../ui/badge";
import type { Booking, Route, Location, Ticket as PrismaTicket } from "@prisma/client";
import { ScrollArea } from "../ui/scroll-area";

interface SanitizedRoute {
    id: string;
    origin: Location;
    destination: Location;
}

interface RecentBookingsProps {
    bookings: (Booking & { tickets: PrismaTicket[], totalPrice: number })[];
    routes: SanitizedRoute[];
}

export function RecentBookings({ bookings, routes }: RecentBookingsProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBookings = useMemo(() => {
    if (!searchTerm) {
      return bookings;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return bookings.filter(booking => {
      const route = routes.find(r => r.id === booking.routeId);
      const bookingDate = new Date(booking.bookingTime).toLocaleDateString();

      return (
        booking.passengerName.toLowerCase().includes(lowercasedFilter) ||
        booking.id.toLowerCase().includes(lowercasedFilter) ||
        bookingDate.includes(lowercasedFilter) ||
        (route && route.origin.name.toLowerCase().includes(lowercasedFilter)) ||
        (route && route.destination.name.toLowerCase().includes(lowercasedFilter))
      );
    });
  }, [searchTerm, bookings, routes]);
  
  const sortedBookings = useMemo(() => {
      return [...filteredBookings].sort((a, b) => new Date(b.bookingTime).getTime() - new Date(a.bookingTime).getTime());
  }, [filteredBookings]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <CardTitle>Recent Bookings</CardTitle>
                <CardDescription>A list of the most recent tickets purchased.</CardDescription>
            </div>
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by ticket #, name, date..."
                    className="pl-8 sm:w-[300px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedBookings.length > 0 ? (
          <div className="w-full">
            {/* Mobile View - Card List */}
            <div className="md:hidden space-y-4">
              {sortedBookings.map(booking => {
                const route = routes.find(r => r.id === booking.routeId);
                return (
                  <div key={booking.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="font-semibold">{booking.passengerName}</div>
                      <Badge variant="outline" className="text-xs">
                        {booking.id.substring(0, 8)}...
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {route ? `${route.origin.name} → ${route.destination.name}` : "N/A"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm items-center justify-between">
                      <div>
                        <span className="font-semibold">Seats:</span> {booking.tickets.length}
                      </div>
                      <div className="font-semibold text-primary">{booking.totalPrice.toFixed(2)} ETB</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {new Date(booking.bookingTime).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block">
              <ScrollArea className="max-h-[500px] w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Passenger</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Seats</TableHead>
                      <TableHead>Booking Date</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedBookings.map(booking => {
                      const route = routes.find(r => r.id === booking.routeId);
                      return (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">
                            <Badge variant="outline">{booking.id.substring(0, 8)}...</Badge>
                          </TableCell>
                          <TableCell>{booking.passengerName}</TableCell>
                          <TableCell>{route ? `${route.origin.name} → ${route.destination.name}` : "N/A"}</TableCell>
                          <TableCell>{booking.tickets.length}</TableCell>
                          <TableCell>{new Date(booking.bookingTime).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">{booking.totalPrice.toFixed(2)} ETB</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            {searchTerm ? (
              <>
                <Search className="mx-auto h-12 w-12" />
                <p className="mt-4">No results found for your search.</p>
              </>
            ) : (
              <>
                <Ticket className="mx-auto h-12 w-12" />
                <p className="mt-4">No bookings have been made yet.</p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
