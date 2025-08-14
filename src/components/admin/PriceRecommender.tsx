"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useData } from "@/lib/store";
import { Search, Ticket } from "lucide-react";
import { Badge } from "../ui/badge";

export function RecentBookings() {
  const { bookings, routes, getBusById } = useData();
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
        (route && route.origin.toLowerCase().includes(lowercasedFilter)) ||
        (route && route.destination.toLowerCase().includes(lowercasedFilter))
      );
    });
  }, [searchTerm, bookings, routes]);
  
  // Sort bookings by most recent
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket ID</TableHead>
              <TableHead>Passenger</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>Booking Date</TableHead>
              <TableHead className="text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedBookings.length > 0 ? (
                sortedBookings.map(booking => {
                const route = routes.find(r => r.id === booking.routeId);
                return (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      <Badge variant="outline">{booking.id.split('-').pop()}</Badge>
                    </TableCell>
                    <TableCell>{booking.passengerName}</TableCell>
                    <TableCell>{route ? `${route.origin} → ${route.destination}` : "N/A"}</TableCell>
                    <TableCell>{booking.seats.map(s => s.id).join(', ')}</TableCell>
                    <TableCell>{new Date(booking.bookingTime).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">${booking.totalPrice.toFixed(2)}</TableCell>
                  </TableRow>
                )
            })
            ) : (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                         No results found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
        {bookings.length === 0 && (
             <div className="text-center p-8 text-muted-foreground">
                <Ticket className="mx-auto h-12 w-12" />
                <p className="mt-4">No bookings have been made yet.</p>
              </div>
        )}
      </CardContent>
    </Card>
  );
}