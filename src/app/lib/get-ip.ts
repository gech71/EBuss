"use server";

import { headers } from "next/headers";
import { NextRequest } from "next/server";

export async function getIP(request?: NextRequest | Request) {
  // Prefer the provided request's headers when available (they are more accurate
  // in app routes/api handlers). Fall back to the Next `headers()` helper.
  const headersList: any =
    request &&
    (request as any).headers &&
    typeof (request as any).headers.get === "function"
      ? (request as any).headers
      : await headers();
  const forwardedFor =
    typeof headersList.get === "function"
      ? headersList.get("x-forwarded-for")
      : undefined;
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp =
    typeof headersList.get === "function"
      ? headersList.get("x-real-ip")
      : undefined;
  if (realIp) {
    return realIp.trim();
  }
  // For local development or when not behind a proxy
  if (request?.ip) {
    return request.ip;
  }

  return null;
}
