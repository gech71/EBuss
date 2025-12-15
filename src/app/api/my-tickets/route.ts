import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PaymentStatus } from "@prisma/client";
import { cookies } from "next/headers";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/cookies";

export const dynamic = "force-dynamic";

async function getPhoneNumberFromSession(
  cookieStore: ReadonlyRequestCookies
): Promise<string | null> {
  const sessionCookie = cookieStore.get("miniapp_session");
  if (sessionCookie) {
    try {
      const decodedSession = Buffer.from(
        sessionCookie.value,
        "base64"
      ).toString("ascii");
      const sessionData = JSON.parse(decodedSession);
      if (sessionData.isAuthenticated && sessionData.phoneNumber) {
        return sessionData.phoneNumber;
      }
    } catch (error) {
      console.error("Failed to parse mini-app session cookie:", error);
      return null;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionPhoneNumber = await getPhoneNumberFromSession(cookieStore);

    let phoneToQuery: string | null = sessionPhoneNumber;

    if (!phoneToQuery) {
      return NextResponse.json([], { status: 200 });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        passengerPhone: phoneToQuery,
        paymentStatus: PaymentStatus.PAID,
      },
      include: {
        tickets: true,
        route: {
          include: {
            origin: true,
            destination: true,
            bus: {
              include: {
                owner: true,
              },
            },
          },
        },
      },
      orderBy: {
        bookingTime: "desc",
      },
    });

    if (!bookings) {
      return NextResponse.json([], { status: 200 });
    }

    // Sanitize decimal fields for the client
    const sanitizedBookings = bookings.map((booking) => ({
      ...booking,
      totalPrice: Number(booking.totalPrice),
      route: {
        ...booking.route,
        price: Number(booking.route.price),
      },
    }));

    return NextResponse.json(sanitizedBookings);
  } catch (error) {
    console.error("Failed to fetch tickets:", error);
    return new NextResponse(
      JSON.stringify({ message: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
