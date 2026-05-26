import Link from "next/link";
import { BarChart3, Download, Filter, Ticket, WalletCards } from "lucide-react";
import { PaymentStatus } from "@prisma/client";

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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { validateRequest } from "@/lib/server/auth";
import { formatRouteDateTime } from "@/lib/route-time";
import { redirect } from "next/navigation";

import {
  getReportData,
  type ReportsSearchParams,
} from "../../../lib/server/reports";

interface ReportsPageProps {
  searchParams: Promise<ReportsSearchParams> | ReportsSearchParams;
}

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildExportHref(params: ReportsSearchParams) {
  const searchParams = new URLSearchParams();

  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.busId && params.busId !== "all")
    searchParams.set("busId", params.busId);
  if (params.originId && params.originId !== "all")
    searchParams.set("originId", params.originId);
  if (params.destinationId && params.destinationId !== "all")
    searchParams.set("destinationId", params.destinationId);
  if (params.paymentStatus && params.paymentStatus !== "all")
    searchParams.set("paymentStatus", params.paymentStatus);
  if (params.reference?.trim())
    searchParams.set("reference", params.reference.trim());

  return `/api/admin/reports/export?${searchParams.toString()}`;
}

export default async function AdminReportsPage({
  searchParams,
}: ReportsPageProps) {
  const { user } = await validateRequest();

  if (!user || !user.busOwnerId) {
    return redirect("/login");
  }

  const params = await searchParams;

  let reportData;

  try {
    reportData = await getReportData(user.busOwnerId, params);
  } catch {
    return redirect("/login");
  }

  const { buses, locations, routes, bookings, totals, summaries } = reportData;
  const exportHref = buildExportHref(params);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Reports</CardTitle>
          <CardDescription>
            Review your company performance, ticket inventory, sales, revenue,
            and transaction references for your own routes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-4" action="/admin/reports">
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                name="from"
                type="date"
                defaultValue={params.from}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input id="to" name="to" type="date" defaultValue={params.to} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="busId">Bus</Label>
              <select
                id="busId"
                name="busId"
                defaultValue={params.busId ?? "all"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All buses</option>
                {buses.map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="originId">Departure</Label>
              <select
                id="originId"
                name="originId"
                defaultValue={params.originId ?? "all"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All departure locations</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="destinationId">Destination</Label>
              <select
                id="destinationId"
                name="destinationId"
                defaultValue={params.destinationId ?? "all"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All destination locations</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <select
                id="paymentStatus"
                name="paymentStatus"
                defaultValue={params.paymentStatus ?? "all"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                {Object.values(PaymentStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                name="reference"
                placeholder="Transaction reference"
                defaultValue={params.reference}
              />
            </div>
            <div className="flex items-end gap-2 lg:col-span-4">
              <Button type="submit">
                <Filter className="h-4 w-4" />
                Apply Filters
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/admin/reports">Clear</Link>
              </Button>
              <Button asChild type="button" variant="outline">
                <a href={exportHref}>
                  <Download className="h-4 w-4" />
                  Export to Excel
                </a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Issued Tickets
            </CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.issuedTickets}</div>
            <p className="text-xs text-muted-foreground">
              Tickets issued in the selected report scope.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Tickets
            </CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.availableTickets}</div>
            <p className="text-xs text-muted-foreground">
              Unsold seats on matching routes.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMoney(totals.salesValue)} ETB
            </div>
            <p className="text-xs text-muted-foreground">
              Total booking value before payment-status settlement.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <WalletCards className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMoney(totals.totalRevenue)} ETB
            </div>
            <p className="text-xs text-muted-foreground">
              Paid payment amount in the selected report scope.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Bus Owner Summary</CardTitle>
          <CardDescription>
            Sales and inventory for your registered bus owner.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bus Owner</TableHead>
                <TableHead className="text-right">Routes</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Issued</TableHead>
                <TableHead className="text-right">Sales Volume</TableHead>
                <TableHead className="text-right">Sales Value</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">References</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((summary) => (
                <TableRow key={summary.ownerId}>
                  <TableCell className="font-medium">
                    {summary.ownerName}
                  </TableCell>
                  <TableCell className="text-right">
                    {summary.routes.size}
                  </TableCell>
                  <TableCell className="text-right">
                    {summary.availableTickets}
                  </TableCell>
                  <TableCell className="text-right">
                    {summary.issuedTickets}
                  </TableCell>
                  <TableCell className="text-right">
                    {summary.salesVolume}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(summary.salesValue)} ETB
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(summary.totalRevenue)} ETB
                  </TableCell>
                  <TableCell className="text-right">
                    {summary.transactionReferences.size}
                  </TableCell>
                </TableRow>
              ))}
              {summaries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No report data matches the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {summaries.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell>Totals</TableCell>
                  <TableCell className="text-right">{routes.length}</TableCell>
                  <TableCell className="text-right">
                    {totals.availableTickets}
                  </TableCell>
                  <TableCell className="text-right">
                    {totals.issuedTickets}
                  </TableCell>
                  <TableCell className="text-right">
                    {totals.salesVolume}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(totals.salesValue)} ETB
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(totals.totalRevenue)} ETB
                  </TableCell>
                  <TableCell className="text-right">
                    {totals.transactionReferences}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Reference Detail</CardTitle>
          <CardDescription>
            Paid references and booking details for tracking and verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Bus</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Passenger</TableHead>
                <TableHead className="text-right">Tickets</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => {
                const payment = booking.payments[0];
                return (
                  <TableRow key={booking.id}>
                    <TableCell>
                      {formatRouteDateTime(booking.bookingTime, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {payment?.referenceNumber ?? "-"}
                    </TableCell>
                    <TableCell>{booking.route.bus.name}</TableCell>
                    <TableCell>
                      {booking.route.origin.name} -&gt;{" "}
                      {booking.route.destination.name}
                    </TableCell>
                    <TableCell>{booking.passengerName}</TableCell>
                    <TableCell className="text-right">
                      {booking.tickets.length}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(
                        payment
                          ? Number(payment.amount)
                          : Number(booking.totalPrice),
                      )}{" "}
                      ETB
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          booking.paymentStatus === "PAID"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {booking.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {bookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No transactions match the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
