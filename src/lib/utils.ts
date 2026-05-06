import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes an email address by:
 * 1. Converting to lowercase
 * 2. Stripping sub-addressing (e.g., user+extra@gmail.com -> user@gmail.com)
 */
export function normalizeEmail(email: string): string {
  const [localPart, domain] = email.trim().toLowerCase().split("@");
  if (!domain) return email.toLowerCase();

  // Strip sub-addressing
  const baseLocalPart = localPart.split("+")[0];

  return `${baseLocalPart}@${domain}`;
}

import { Discount, DiscountTier, DiscountValueType } from "@prisma/client";

export function calculateFinalPrice({
  outboundPrice,
  returnPrice,
  outboundSeats,
  returnSeats,
  isRoundTrip,
  discount,
  roundTripDiscountValue,
  roundTripDiscountType,
}: {
  outboundPrice: number;
  returnPrice: number;
  outboundSeats: number;
  returnSeats: number;
  isRoundTrip: boolean;
  discount: (Discount & { tiers: DiscountTier[] }) | null;
  roundTripDiscountValue: number | null;
  roundTripDiscountType: DiscountValueType | null;
}) {
  const subtotal = outboundPrice + returnPrice;
  let totalDiscountAmount = 0;
  const now = new Date();

  const ticketCountForDiscount = isRoundTrip
    ? outboundSeats + returnSeats
    : outboundSeats;

  const isDiscountActive =
    discount &&
    now >= new Date(discount.startDate) &&
    now <= new Date(discount.endDate);

  if (isDiscountActive && ticketCountForDiscount > 0) {
    let generalDiscountAmount = 0;
    if (discount.type === "DATE_BASED" && discount.percentage) {
      generalDiscountAmount = (subtotal * Number(discount.percentage)) / 100;
    } else if (discount.type === "TICKET_COUNT_BASED") {
      const applicableTier = discount.tiers
        .filter(
          (tier) =>
            ticketCountForDiscount >= tier.minTickets &&
            ticketCountForDiscount <= tier.maxTickets,
        )
        .sort((a, b) => Number(b.percentage) - Number(a.percentage))[0];

      if (applicableTier) {
        generalDiscountAmount =
          (subtotal * Number(applicableTier.percentage)) / 100;
      }
    }
    totalDiscountAmount += generalDiscountAmount;
  }

  if (isRoundTrip && returnPrice > 0 && roundTripDiscountValue) {
    let roundTripDiscountAmount = 0;
    if (roundTripDiscountType === "PERCENTAGE") {
      roundTripDiscountAmount =
        (subtotal * Number(roundTripDiscountValue)) / 100;
    } else if (roundTripDiscountType === "FIXED") {
      roundTripDiscountAmount = Number(roundTripDiscountValue);
    }
    totalDiscountAmount += roundTripDiscountAmount;
  }

  return {
    subtotal,
    discountAmount: totalDiscountAmount,
    finalPrice: subtotal - totalDiscountAmount,
  };
}
