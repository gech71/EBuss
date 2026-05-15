"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import crypto from "crypto";
import { format } from "date-fns";
import { TicketStatus, PaymentStatus } from "@prisma/client";
import { validateCsrf } from "@/app/lib/actions";
import { logAction } from "@/app/lib/logger";
import { calculateFinalPrice } from "@/lib/utils";

const tripSchema = z.object({
  routeId: z.string().min(1),
  selectedSeatNumbers: z
    .array(z.string())
    .min(1, "At least one seat must be selected."),
});

const createBookingSchema = z.object({
  isRoundTrip: z.string().transform((val) => val === "true"),
  totalPrice: z.coerce.number(),
  passengerName: z.string().min(1, "Passenger name is required."),
  passengerPhone: z.string().min(1, "Passenger phone is required."),
  outboundTrip: z
    .string()
    .transform((str) => tripSchema.parse(JSON.parse(str))),
  returnTrip: z
    .string()
    .nullable()
    .optional()
    .transform((str) => (str ? tripSchema.parse(JSON.parse(str)) : undefined)),
});

async function createTicketsForTrip(
  tx: any,
  trip: z.infer<typeof tripSchema>,
  passengerName: string,
  passengerPhone: string,
  totalPriceForTrip: number,
  commonExpiresAt: Date,
  isReturn: boolean = false,
) {
  const route = await tx.route.findUnique({
    where: { id: trip.routeId },
  });

  if (!route) throw new Error(`Route not found for trip: ${trip.routeId}`);

  // Server-side check for seat availability within the transaction
  const existingTicketsForRoute = await tx.ticket.findMany({
    where: {
      routeId: trip.routeId,
      status: { in: ["VALID", "PENDING"] },
    },
    select: { seatNumber: true },
  });

  const occupiedSeatNumbers = new Set(
    existingTicketsForRoute.map((t) => t.seatNumber),
  );

  const unavailableSelectedSeats = trip.selectedSeatNumbers.filter((seatNum) =>
    occupiedSeatNumbers.has(seatNum),
  );

  if (unavailableSelectedSeats.length > 0) {
    throw new Error(
      `One or more seats for the ${isReturn ? "return" : "outbound"} trip are no longer available: ${unavailableSelectedSeats.join(", ")}.`,
    );
  }

  // Create one parent booking
  const booking = await tx.booking.create({
    data: {
      passengerName,
      passengerPhone,
      totalPrice: totalPriceForTrip,
      routeId: trip.routeId,
      paymentStatus: "PENDING",
      expiresAt: commonExpiresAt,
      tickets: {
        create: trip.selectedSeatNumbers.map((seatNumber) => ({
          seatNumber,
          status: TicketStatus.PENDING,
          routeId: trip.routeId,
        })),
      },
    },
  });

  await logAction({
    actionType: "CREATE_BOOKING",
    description: `Booking ${booking.id} created for passenger ${passengerName} on route ${trip.routeId}. Seats: ${trip.selectedSeatNumbers.join(", ")}`,
    details: { booking },
  });
  return booking;
}

export async function createBookingAction(formData: FormData) {
  try {
    await validateCsrf(formData);
  } catch (error) {
    return {
      success: false,
      message:
        "Your session has expired or is invalid. Please refresh the page and try again.",
    };
  }

  const rawData = {
    isRoundTrip: formData.get("isRoundTrip"),
    totalPrice: formData.get("totalPrice"),
    passengerName: formData.get("passengerName"),
    passengerPhone: formData.get("passengerPhone"),
    outboundTrip: formData.get("outboundTrip"),
    returnTrip: formData.get("returnTrip"),
  };

  const validatedData = createBookingSchema.safeParse(rawData);

  if (!validatedData.success) {
    const errorMessage = validatedData.error.errors
      .map((e) => e.message)
      .join(", ");
    await logAction({
      actionType: "CREATE_BOOKING_FAIL",
      description: `Validation failed: ${errorMessage}`,
      details: { attemptedData: rawData },
    });
    return {
      success: false,
      message: errorMessage,
    };
  }

  const {
    isRoundTrip,
    totalPrice,
    passengerName,
    passengerPhone,
    outboundTrip,
    returnTrip,
  } = validatedData.data;

  try {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minute reservation while awaiting payment

    const [outboundBooking] = await prisma.$transaction(async (tx) => {
      const outboundRoute = await tx.route.findUnique({
        where: { id: outboundTrip.routeId },
        include: { discount: { include: { tiers: true } } },
      });
      if (!outboundRoute) throw new Error("Outbound route not found.");
      const outboundPrice =
        Number(outboundRoute.price) * outboundTrip.selectedSeatNumbers.length;

      let returnPrice = 0;
      let returnRoute = null;

      if (isRoundTrip && returnTrip) {
        returnRoute = await tx.route.findUnique({
          where: { id: returnTrip.routeId },
          include: { discount: { include: { tiers: true } } },
        });
        if (!returnRoute) throw new Error("Return route not found.");
        returnPrice =
          Number(returnRoute.price) * returnTrip.selectedSeatNumbers.length;
      }

      // Use reusable utility to calculate the discounted price
      const { finalPrice: calculatedTotalPrice } = calculateFinalPrice({
        outboundPrice,
        returnPrice,
        outboundSeats: outboundTrip.selectedSeatNumbers.length,
        returnSeats: returnTrip?.selectedSeatNumbers.length || 0,
        isRoundTrip,
        discount: outboundRoute.discount,
        roundTripDiscountValue: Number(outboundRoute.roundTripDiscountValue),
        roundTripDiscountType: outboundRoute.roundTripDiscountType,
      });

      if (Math.abs(calculatedTotalPrice - totalPrice) > 0.01) {
        console.warn(
          `Price mismatch: server calculated=${calculatedTotalPrice}, client sent=${totalPrice}. Allowing for now.`,
        );
      }

      const ob = await createTicketsForTrip(
        tx,
        outboundTrip,
        passengerName,
        passengerPhone,
        outboundPrice,
        expiresAt,
        false,
      );
      if (isRoundTrip && returnTrip) {
        const rb = await createTicketsForTrip(
          tx,
          returnTrip,
          passengerName,
          passengerPhone,
          returnPrice,
          expiresAt,
          true,
        );
        return [ob, rb];
      }
      return [ob];
    });

    revalidatePath(`/book/${outboundTrip.routeId}`);
    if (returnTrip) {
      revalidatePath(`/book/${returnTrip.routeId}`);
    }

    return { success: true, bookingId: outboundBooking.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    await logAction({
      actionType: "CREATE_BOOKING_FAIL",
      description: `Booking failed for passenger ${passengerName}. Error: ${message}`,
      details: { error: message, attemptedData: validatedData.data },
    });
    return { success: false, message };
  }
}

export async function createPaymentRequestAction(
  bookingId: string,
  amount: number,
  authToken: string | undefined,
) {
  if (!authToken) {
    return { success: false, message: "Authentication token is missing." };
  }

  const bookingWithOwner = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      route: {
        include: {
          bus: {
            include: {
              owner: true,
            },
          },
        },
      },
    },
  });

  if (!bookingWithOwner?.route?.bus?.owner?.bankAccountNumber) {
    await logAction({
      actionType: "PAYMENT_REQUEST_FAIL",
      description: `Could not find bus owner or bank account for booking ID: ${bookingId}`,
    });
    return { success: false, message: "Bus owner account details not found." };
  }

  const ACCOUNT_NO = bookingWithOwner.route.bus.owner.bankAccountNumber;

  const NIB_PAYMENT_URL = process.env.NIB_PAYMENT_URL;
  const NIB_PAYMENT_KEY = process.env.NIB_PAYMENT_KEY;
  const COMPANY_NAME = process.env.NIB_COMPANY_NAME || "EBUSS";
  const CALLBACK_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/api/portal/payment-callback`;

  if (!NIB_PAYMENT_URL || !NIB_PAYMENT_KEY) {
    await logAction({
      actionType: "PAYMENT_REQUEST_FAIL",
      description:
        "Server not configured for payments (missing NIB_PAYMENT_URL or NIB_PAYMENT_KEY).",
    });
    return {
      success: false,
      message: "Server is not configured for payments.",
    };
  }

  const transactionId = crypto.randomUUID();
  const transactionTime = format(new Date(), "yyyyMMddHHmmss");

  try {
    await prisma.payment.create({
      data: {
        bookingId,
        amount,
        transactionId,
        status: "PENDING",
      },
    });
    await logAction({
      actionType: "PAYMENT_REQUEST_INIT",
      description: `Payment request created for booking ${bookingId} with transactionId ${transactionId}.`,
      details: { bookingId, amount, transactionId },
    });

    const signatureString = [
      `accountNo=${ACCOUNT_NO}`,
      `amount=${amount}`,
      `callBackURL=${CALLBACK_URL}`,
      `companyName=${COMPANY_NAME}`,
      `Key=${NIB_PAYMENT_KEY}`,
      `token=${authToken}`,
      `transactionId=${transactionId}`,
      `transactionTime=${transactionTime}`,
    ].join("&");

    const signature = crypto
      .createHash("sha256")
      .update(signatureString, "utf8")
      .digest("hex");

    const payload = {
      accountNo: ACCOUNT_NO,
      amount: String(amount),
      callBackURL: CALLBACK_URL,
      companyName: COMPANY_NAME,
      token: authToken,
      transactionId: transactionId,
      transactionTime: transactionTime,
      signature: signature,
    };

    const response = await fetch(NIB_PAYMENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (response.ok && responseData.token) {
      await prisma.payment.update({
        where: { transactionId },
        data: { paymentToken: responseData.token },
      });
      await logAction({
        actionType: "PAYMENT_TOKEN_SUCCESS",
        description: `Received payment token for transaction ${transactionId}.`,
        details: { transactionId, responseData },
      });
      return { success: true, paymentToken: responseData.token };
    } else {
      await logAction({
        actionType: "PAYMENT_TOKEN_FAIL",
        description: `Failed to get payment token for transaction ${transactionId}. Response: ${JSON.stringify(responseData)}`,
        details: { transactionId, responseData },
      });
      return {
        success: false,
        message: responseData.message || "Failed to get payment token.",
      };
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred during payment initiation.";
    await logAction({
      actionType: "PAYMENT_REQUEST_FAIL",
      description: `Payment request failed for transaction ${transactionId}: ${message}`,
      details: { error: message, transactionId },
    });
    return { success: false, message };
  }
}
