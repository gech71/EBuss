"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, Ticket, AlertTriangle } from "lucide-react";
import type { Booking, PaymentStatus } from "@prisma/client";

const POLLING_INTERVAL = 2000; // 2 seconds
const POLLING_DURATION = 10 * 60 * 1000; // 10 minutes

interface PaymentStatusCheckerProps {
  booking: Booking;
}

export function PaymentStatusChecker({ booking }: PaymentStatusCheckerProps) {
  const router = useRouter();
  const [status, setStatus] = useState<PaymentStatus>(booking.paymentStatus);
  const [isPolling, setIsPolling] = useState(true);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const hasPaidRef = useRef(false);

  const handleTimeout = useCallback(() => {
    setIsPolling(false);
    setIsTimedOut(true);
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (status === "PAID" || hasPaidRef.current) {
      setIsPolling(false);
      return;
    }

    const startTime = Date.now();
    let intervalId: ReturnType<typeof setInterval>;

    const checkPaymentStatus = async () => {
      if (hasPaidRef.current) return;

      if (Date.now() - startTime > POLLING_DURATION) {
        clearInterval(intervalId);
        handleTimeout();
        return;
      }

      try {
        const response = await fetch(`/api/ticket/${booking.id}/status`, {
          cache: "no-store",
        });
        if (!response.ok) {
          console.error("Payment status check failed:", response.status);
          return;
        }

        const data = await response.json();
        if (data.paymentStatus === "PAID") {
          hasPaidRef.current = true;
          clearInterval(intervalId);
          setIsPolling(false);
          setStatus("PAID");
          router.refresh();
        }
      } catch (error) {
        console.error("Failed to poll for payment status:", error);
      }
    };

    void checkPaymentStatus();
    intervalId = setInterval(checkPaymentStatus, POLLING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [booking.id, status, router, handleTimeout]);

  if (status === "PAID") {
    return (
      <Alert className="max-w-md">
        <Ticket className="h-4 w-4" />
        <AlertTitle>Payment Confirmed!</AlertTitle>
        <AlertDescription>
          Your payment has been successfully processed. Redirecting to your
          ticket...
        </AlertDescription>
        <div className="flex items-center justify-center pt-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Alert>
    );
  }

  if (isPolling) {
    return (
      <Alert className="max-w-md">
        <Ticket className="h-4 w-4" />
        <AlertTitle>Awaiting Payment Confirmation</AlertTitle>
        <AlertDescription>
          Your ticket purchase is not yet paid. We are actively checking for
          payment confirmation. Complete payment in the NibTera app and this
          page will update automatically.
        </AlertDescription>
        <div className="flex items-center justify-center pt-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Alert>
    );
  }

  if (isTimedOut) {
    return (
      <Alert variant="destructive" className="max-w-md">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Payment Not Confirmed</AlertTitle>
        <AlertDescription>
          We have not received payment confirmation yet. If you completed
          payment, refresh this page or contact support with your purchase
          reference.
        </AlertDescription>
        <div className="pt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.refresh()}>
            Refresh
          </Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            Go to Homepage
          </Button>
          <Button onClick={() => router.push(`/book/${booking.routeId}`)}>
            Try Again
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive" className="max-w-md">
      <Ticket className="h-4 w-4" />
      <AlertTitle>Payment Pending</AlertTitle>
      <AlertDescription>
        This purchase is not yet paid. The ticket and QR code will be available
        once payment is completed successfully.
      </AlertDescription>
    </Alert>
  );
}
