import { PaymentStatus } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getRouteDateRange } from "@/lib/route-time";

export type ReportsSearchParams = {
  from?: string;
  to?: string;
  busId?: string;
  originId?: string;
  destinationId?: string;
  paymentStatus?: string;
  reference?: string;
};

export function getSelectValue(value: string | undefined) {
  return value && value !== "all" ? value : undefined;
}

export function getDateFilter(from?: string, to?: string) {
  if (!from && !to) {
    return undefined;
  }

  const fromDate = from || to;
  const toDate = to || from;

  if (!fromDate || !toDate) {
    return undefined;
  }

  return {
    gte: getRouteDateRange(fromDate).start,
    lte: getRouteDateRange(toDate).end,
  };
}

export type OwnerSummary = {
  ownerId: string;
  ownerName: string;
  routes: Set<string>;
  issuedTickets: number;
  availableTickets: number;
  salesVolume: number;
  salesValue: number;
  totalRevenue: number;
  transactionReferences: Set<string>;
};

export async function getReportData(ownerId: string, params: ReportsSearchParams) {
  const selectedBusId = getSelectValue(params.busId);
  const selectedOriginId = getSelectValue(params.originId);
  const selectedDestinationId = getSelectValue(params.destinationId);
  const selectedPaymentStatus = getSelectValue(params.paymentStatus);
  const reference = params.reference?.trim();
  const bookingDateFilter = getDateFilter(params.from, params.to);

  const owner = await prisma.busOwner.findUnique({
    where: { id: ownerId },
    select: { id: true, name: true },
  });

  if (!owner) {
    throw new Error("Bus owner not found");
  }

  const [buses, locations] = await Promise.all([
    prisma.bus.findMany({
      where: { ownerId: owner.id },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  const routes = await prisma.route.findMany({
    where: {
      bus: {
        ownerId: owner.id,
        ...(selectedBusId ? { id: selectedBusId } : {}),
      },
      ...(selectedOriginId ? { originId: selectedOriginId } : {}),
      ...(selectedDestinationId
        ? { destinationId: selectedDestinationId }
        : {}),
    },
    include: {
      bus: { include: { owner: true } },
      origin: true,
      destination: true,
      tickets: { select: { id: true } },
    },
    orderBy: { departureTime: "asc" },
  });

  const routeIds = routes.map((route) => route.id);

  const bookings = routeIds.length
    ? await prisma.booking.findMany({
        where: {
          routeId: { in: routeIds },
          ...(bookingDateFilter ? { bookingTime: bookingDateFilter } : {}),
          ...(selectedPaymentStatus
            ? { paymentStatus: selectedPaymentStatus as PaymentStatus }
            : {}),
          ...(reference
            ? {
                payments: {
                  some: {
                    referenceNumber: {
                      contains: reference,
                      mode: "insensitive",
                    },
                  },
                },
              }
            : {}),
        },
        include: {
          tickets: true,
          route: {
            include: {
              origin: true,
              destination: true,
              bus: { include: { owner: true } },
            },
          },
          payments: {
            orderBy: { createdAt: "desc" },
            select: {
              amount: true,
              status: true,
              referenceNumber: true,
              transactionId: true,
              createdAt: true,
            },
          },
        },
        orderBy: { bookingTime: "desc" },
      })
    : [];

  const summary: OwnerSummary = {
    ownerId: owner.id,
    ownerName: owner.name,
    routes: new Set<string>(),
    issuedTickets: 0,
    availableTickets: 0,
    salesVolume: 0,
    salesValue: 0,
    totalRevenue: 0,
    transactionReferences: new Set<string>(),
  };

  for (const route of routes) {
    summary.routes.add(route.id);
    summary.availableTickets += Math.max(
      route.bus.capacity - route.tickets.length,
      0,
    );
  }

  for (const booking of bookings) {
    const issuedTickets = booking.tickets.length;
    const paidPayments = booking.payments.filter(
      (payment) => payment.status === PaymentStatus.PAID,
    );

    summary.routes.add(booking.routeId);
    summary.issuedTickets += issuedTickets;
    summary.salesVolume += issuedTickets;
    summary.salesValue += Number(booking.totalPrice);
    summary.totalRevenue += paidPayments.reduce(
      (total, payment) => total + Number(payment.amount),
      0,
    );

    paidPayments.forEach((payment) => {
      if (payment.referenceNumber) {
        summary.transactionReferences.add(payment.referenceNumber);
      }
    });
  }

  const totals = {
    availableTickets: summary.availableTickets,
    issuedTickets: summary.issuedTickets,
    salesVolume: summary.salesVolume,
    salesValue: summary.salesValue,
    totalRevenue: summary.totalRevenue,
    transactionReferences: summary.transactionReferences.size,
  };

  return {
    owner,
    buses,
    locations,
    routes,
    bookings,
    totals,
    summary,
    summaries: [summary],
  };
}
