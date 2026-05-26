"use client";

import { useMemo, useState } from "react";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { CalendarDays, Phone, Search, Ticket, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export interface AdminBooking {
  id: string;
  passengerName: string;
  passengerPhone: string;
  bookingTime: Date;
  totalPrice: number;
  paymentStatus: string;
  referenceNumber: string | null;
  route: {
    origin: { name: string };
    destination: { name: string };
  };
  tickets: { id: string }[];
}

type QuickFilter = {
  label: string;
  getRange: () => { from: Date; to: Date };
};

const quickFilters: QuickFilter[] = [
  {
    label: "Today",
    getRange: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: "Yesterday",
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    },
  },
  {
    label: "This Week",
    getRange: () => ({
      from: startOfWeek(new Date(), { weekStartsOn: 1 }),
      to: endOfWeek(new Date(), { weekStartsOn: 1 }),
    }),
  },
  {
    label: "Last 7 Days",
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: "This Month",
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
];

function toDateInputValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function getDateFromInput(value: string, boundary: "start" | "end") {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return boundary === "start" ? startOfDay(date) : endOfDay(date);
}

export function BookingsTable({ bookings }: { bookings: AdminBooking[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(
    null
  );

  const filteredBookings = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const from = getDateFromInput(fromDate, "start");
    const to = getDateFromInput(toDate, "end");

    return bookings.filter((booking) => {
      const bookingTime = new Date(booking.bookingTime);
      const matchesSearch =
        !normalizedSearch ||
        booking.passengerName.toLowerCase().includes(normalizedSearch) ||
        booking.passengerPhone.toLowerCase().includes(normalizedSearch) ||
        (booking.referenceNumber?.toLowerCase().includes(normalizedSearch) ??
          false);
      const matchesFrom = !from || bookingTime >= from;
      const matchesTo = !to || bookingTime <= to;

      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [bookings, fromDate, searchTerm, toDate]);

  const totalRevenue = filteredBookings.reduce(
    (total, booking) => total + booking.totalPrice,
    0
  );
  const totalTickets = filteredBookings.reduce(
    (total, booking) => total + booking.tickets.length,
    0
  );

  function applyQuickFilter(filter: QuickFilter) {
    const range = filter.getRange();
    setFromDate(toDateInputValue(range.from));
    setToDate(toDateInputValue(range.to));
    setActiveQuickFilter(filter.label);
  }

  function clearFilters() {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setActiveQuickFilter(null);
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>All Bookings</CardTitle>
            <CardDescription>
              View customer bookings with phone numbers, dates, routes, and payment totals.
            </CardDescription>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-md border px-3 py-2">
              <div className="text-xs text-muted-foreground">Bookings</div>
              <div className="text-lg font-semibold">
                {filteredBookings.length}
              </div>
            </div>
            <div className="rounded-md border px-3 py-2">
              <div className="text-xs text-muted-foreground">Tickets</div>
              <div className="text-lg font-semibold">{totalTickets}</div>
            </div>
            <div className="rounded-md border px-3 py-2">
              <div className="text-xs text-muted-foreground">Revenue</div>
              <div className="text-lg font-semibold">
                {totalRevenue.toFixed(2)} ETB
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto]">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by customer name, phone, or reference"
              className="pl-8"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="relative">
              <CalendarDays className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="From date"
                type="date"
                className="pl-8"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  setActiveQuickFilter(null);
                }}
              />
            </div>
            <div className="relative">
              <CalendarDays className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="To date"
                type="date"
                className="pl-8"
                value={toDate}
                onChange={(event) => {
                  setToDate(event.target.value);
                  setActiveQuickFilter(null);
                }}
              />
            </div>
            <Button type="button" variant="outline" onClick={clearFilters}>
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickFilters.map((filter) => (
            <Button
              key={filter.label}
              type="button"
              variant={
                activeQuickFilter === filter.label ? "default" : "outline"
              }
              size="sm"
              onClick={() => applyQuickFilter(filter)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {filteredBookings.length > 0 ? (
          <div className="w-full">
            <div className="space-y-4 md:hidden">
              {filteredBookings.map((booking) => (
                <div key={booking.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        {booking.passengerName}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {booking.passengerPhone}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {booking.id.substring(0, 8)}...
                    </Badge>
                  </div>
                  <div className="mt-3 text-sm">
                    {booking.route.origin.name} -&gt; {booking.route.destination.name}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>{booking.tickets.length} seats</span>
                    <span>
                      {format(new Date(booking.bookingTime), "MMM d, yyyy")}
                    </span>
                    <span className="font-semibold text-primary">
                      {booking.totalPrice.toFixed(2)} ETB
                    </span>
                  </div>
                  {booking.paymentStatus === "PAID" && booking.referenceNumber ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Reference:{" "}
                      <span className="font-mono text-foreground">
                        {booking.referenceNumber}
                      </span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="hidden md:block">
              <ScrollArea className="max-h-[640px] w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Seats</TableHead>
                      <TableHead>Booking Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          <Badge variant="outline">
                            {booking.id.substring(0, 8)}...
                          </Badge>
                        </TableCell>
                        <TableCell>{booking.passengerName}</TableCell>
                        <TableCell>{booking.passengerPhone}</TableCell>
                        <TableCell>
                          {booking.route.origin.name} -&gt; {booking.route.destination.name}
                        </TableCell>
                        <TableCell>{booking.tickets.length}</TableCell>
                        <TableCell>
                          {format(new Date(booking.bookingTime), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{booking.paymentStatus}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {booking.paymentStatus === "PAID" && booking.referenceNumber
                            ? booking.referenceNumber
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {booking.totalPrice.toFixed(2)} ETB
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <Ticket className="mx-auto h-12 w-12" />
            <p className="mt-4">No bookings match the selected filters.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
