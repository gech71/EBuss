
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Ticket, Info, AlertTriangle } from 'lucide-react';
import type { Booking, PaymentStatus } from "@prisma/client";

const POLLING_INTERVAL = 5000; // 5 seconds
const POLLING_DURATION = 30000; // 30 seconds

interface PaymentStatusCheckerProps {
    booking: Booking;
}

export function PaymentStatusChecker({ booking }: PaymentStatusCheckerProps) {
    const router = useRouter();
    const [status, setStatus] = useState<PaymentStatus>(booking.paymentStatus);
    const [isPolling, setIsPolling] = useState(true);
    const [isTimedOut, setIsTimedOut] = useState(false);

    useEffect(() => {
        if (status === 'PAID') {
            setIsPolling(false);
            return;
        }

        const startTime = Date.now();

        const intervalId = setInterval(async () => {
            if (Date.now() - startTime > POLLING_DURATION) {
                clearInterval(intervalId);
                setIsPolling(false);
                setIsTimedOut(true);
                return;
            }

            try {
                const response = await fetch(`/api/ticket/${booking.id}/status`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.paymentStatus === 'PAID') {
                        clearInterval(intervalId);
                        setIsPolling(false);
                        setStatus('PAID');
                        // Force a page reload to get the full ticket data
                        router.refresh();
                    }
                }
            } catch (error) {
                console.error("Failed to poll for payment status:", error);
            }
        }, POLLING_INTERVAL);

        return () => clearInterval(intervalId);
    }, [booking.id, status, router]);

    if (status === 'PAID') {
        // This state should be quickly replaced by the router refresh showing the real ticket.
        return (
             <Alert className="max-w-md">
                <Ticket className="h-4 w-4" />
                <AlertTitle>Payment Confirmed!</AlertTitle>
                <AlertDescription>
                   Your payment has been successfully processed. Redirecting to your ticket...
                </AlertDescription>
                <div className="flex items-center justify-center pt-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </Alert>
        )
    }

    if (isPolling) {
        return (
            <Alert className="max-w-md">
                <Ticket className="h-4 w-4" />
                <AlertTitle>Awaiting Payment Confirmation</AlertTitle>
                <AlertDescription>
                    This booking is not yet paid for. We are actively checking for payment confirmation. Please do not close this page.
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
                <AlertTitle>Payment Check Timed Out</AlertTitle>
                <AlertDescription>
                   We could not confirm your payment automatically. If you have paid, please click the button below to check again or contact support.
                </AlertDescription>
                 <div className="pt-4 flex justify-end">
                    <Button onClick={() => router.refresh()}>Check Status Manually</Button>
                </div>
            </Alert>
        )
    }

    // Default state if not paid, not polling, and not timed out.
    return (
        <Alert variant="destructive" className="max-w-md">
            <Ticket className="h-4 w-4" />
            <AlertTitle>Booking Not Paid</AlertTitle>
            <AlertDescription>
                This booking is not yet paid for. The ticket and QR code will be available once the payment is completed successfully.
            </AlertDescription>
        </Alert>
    );
}
