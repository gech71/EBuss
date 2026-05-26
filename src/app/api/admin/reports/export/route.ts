import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { validateRequest } from "@/lib/server/auth";
import { formatRouteDateTime } from "@/lib/route-time";
import { getReportData, type ReportsSearchParams } from "@/lib/server/reports";

function buildReportSearchParams(request: NextRequest): ReportsSearchParams {
  const searchParams = request.nextUrl.searchParams;

  return {
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    busId: searchParams.get("busId") ?? undefined,
    originId: searchParams.get("originId") ?? undefined,
    destinationId: searchParams.get("destinationId") ?? undefined,
    paymentStatus: searchParams.get("paymentStatus") ?? undefined,
    reference: searchParams.get("reference") ?? undefined,
  };
}

export async function GET(request: NextRequest) {
  const { user } = await validateRequest();

  if (!user || !user.busOwnerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = buildReportSearchParams(request);

  let reportData;
  try {
    reportData = await getReportData(user.busOwnerId, params);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load report data",
      },
      { status: 404 },
    );
  }

  const workbook = XLSX.utils.book_new();

  const summaryRows = [
    {
      Owner: reportData.summary.ownerName,
      Routes: reportData.summary.routes.size,
      Available: reportData.summary.availableTickets,
      Issued: reportData.summary.issuedTickets,
      Sales_Volume: reportData.summary.salesVolume,
      Sales_Value_ETB: reportData.summary.salesValue,
      Total_Revenue_ETB: reportData.summary.totalRevenue,
      Transaction_References: reportData.summary.transactionReferences.size,
    },
  ];

  const transactionRows = reportData.bookings.map((booking) => {
    const payment = booking.payments[0];

    return {
      Date: formatRouteDateTime(booking.bookingTime, "MMM d, yyyy"),
      Reference: payment?.referenceNumber ?? "-",
      Bus: booking.route.bus.name,
      Route: `${booking.route.origin.name} -> ${booking.route.destination.name}`,
      Passenger: booking.passengerName,
      Tickets: booking.tickets.length,
      Amount_ETB: payment ? Number(payment.amount) : Number(booking.totalPrice),
      Status: booking.paymentStatus,
    };
  });

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(summaryRows),
    "Summary",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(transactionRows),
    "Transactions",
  );

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  const filename = `business-reports-${new Date()
    .toISOString()
    .slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
