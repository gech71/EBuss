"use client";

import { useMemo, useState } from "react";
import type { Location, Ticket as PrismaTicket } from "@prisma/client";
import { Search, Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SanitizedRoute {
  id: string;
  origin: Location;
  destination: Location;
}

interface RecentBooking {
  id: string;
  passengerName: string;
  passengerPhone: string;
  bookingTime: Date;
  totalPrice: number;
  routeId: string;
  paymentStatus: string;
  payments?: { referenceNumber: string | null }[];
  tickets: PrismaTicket[];
}

interface RecentBookingsProps {
  bookings: RecentBooking[];
  routes: SanitizedRoute[];
}

export function RecentBookings({ bookings, routes }: RecentBookingsProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBookings = useMemo(() => {
    if (!searchTerm) {
      return bookings;
    }

    const lowercasedFilter = searchTerm.toLowerCase();
    return bookings.filter((booking) => {
      const route = routes.find((r) => r.id === booking.routeId);
      const bookingDate = new Date(booking.bookingTime).toLocaleDateString();

      return (
        booking.passengerName.toLowerCase().includes(lowercasedFilter) ||
        booking.passengerPhone.toLowerCase().includes(lowercasedFilter) ||
        (booking.payments?.[0]?.referenceNumber
          ?.toLowerCase()
          .includes(lowercasedFilter) ??
          false) ||
        booking.id.toLowerCase().includes(lowercasedFilter) ||
        bookingDate.includes(lowercasedFilter) ||
        (route && route.origin.name.toLowerCase().includes(lowercasedFilter)) ||
        (route &&
          route.destination.name.toLowerCase().includes(lowercasedFilter))
      );
    });
  }, [searchTerm, bookings, routes]);

  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort(
      (a, b) =>
        new Date(b.bookingTime).getTime() - new Date(a.bookingTime).getTime()
    );
  }, [filteredBookings]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>
              A list of the most recent tickets purchased.
            </CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by ticket #, name, phone, reference..."
              className="pl-8 sm:w-[320px]"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedBookings.length > 0 ? (
          <div className="w-full">
            <div className="space-y-4 md:hidden">
              {sortedBookings.map((booking) => {
                const route = routes.find((r) => r.id === booking.routeId);
                return (
                  <div key={booking.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">
                          {booking.passengerName}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {booking.passengerPhone}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {booking.id.substring(0, 8)}...
                      </Badge>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {route
                        ? `${route.origin.name} -> ${route.destination.name}`
                        : "N/A"}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
                      <div>
                        <span className="font-semibold">Seats:</span>{" "}
                        {booking.tickets.length}
                      </div>
                      <div className="font-semibold text-primary">
                        {booking.totalPrice.toFixed(2)} ETB
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {new Date(booking.bookingTime).toLocaleDateString()}
                    </div>
                    {booking.paymentStatus === "PAID" &&
                    booking.payments?.[0]?.referenceNumber ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Reference:{" "}
                        <span className="font-mono text-foreground">
                          {booking.payments[0].referenceNumber}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block">
              <ScrollArea className="max-h-[500px] w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Passenger</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Seats</TableHead>
                      <TableHead>Booking Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedBookings.map((booking) => {
                      const route = routes.find((r) => r.id === booking.routeId);
                      return (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">
                            <Badge variant="outline">
                              {booking.id.substring(0, 8)}...
                            </Badge>
                          </TableCell>
                          <TableCell>{booking.passengerName}</TableCell>
                          <TableCell>{booking.passengerPhone}</TableCell>
                          <TableCell>
                            {route
                              ? `${route.origin.name} -> ${route.destination.name}`
                              : "N/A"}
                          </TableCell>
                          <TableCell>{booking.tickets.length}</TableCell>
                          <TableCell>
                            {new Date(booking.bookingTime).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {booking.paymentStatus === "PAID" &&
                            booking.payments?.[0]?.referenceNumber
                              ? booking.payments[0].referenceNumber
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {booking.totalPrice.toFixed(2)} ETB
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
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
