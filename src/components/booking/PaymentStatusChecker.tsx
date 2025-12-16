
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Ticket, AlertTriangle } from 'lucide-react';
import type { Booking, PaymentStatus } from "@prisma/client";

const POLLING_INTERVAL = 3000; // 3 seconds
const POLLING_DURATION = 60 * 1000; // 1 minute max polling

interface PaymentStatusCheckerProps {
    booking: Booking;
}

export function PaymentStatusChecker({ booking }: PaymentStatusCheckerProps) {
    const router = useRouter();
    const [status, setStatus] = useState<PaymentStatus>(booking.paymentStatus);
    const [isPolling, setIsPolling] = useState(true);

    const checkStatus = useCallback(async () => {
        try {
            const response = await fetch(`/api/ticket/${booking.id}/status`);
            if (response.ok) {
                const data = await response.json();
                return data.paymentStatus as PaymentStatus;
            }
        } catch (error) {
            console.error("Failed to poll for payment status:", error);
        }
        return status; // Return current status on error
    }, [booking.id, status]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout | undefined;

        const startPolling = async () => {
             // Perform an immediate check on mount
            const initialStatus = await checkStatus();
            if (initialStatus === 'PAID') {
                setStatus('PAID');
                setIsPolling(false);
                router.refresh();
                return;
            }
            if (initialStatus === 'FAILED') {
                setStatus('FAILED');
                setIsPolling(false);
                return;
            }

            const startTime = Date.now();
            intervalId = setInterval(async () => {
                if (Date.now() - startTime > POLLING_DURATION) {
                    clearInterval(intervalId);
                    setIsPolling(false);
                    setStatus('FAILED'); // Assume failure after long polling
                    return;
                }

                const newStatus = await checkStatus();
                 if (newStatus === 'PAID' || newStatus === 'FAILED') {
                    clearInterval(intervalId);
                    setIsPolling(false);
                    setStatus(newStatus);
                    if (newStatus === 'PAID') {
                        router.refresh();
                    }
                }
            }, POLLING_INTERVAL);
        }

        if (status === 'PENDING') {
            startPolling();
        } else {
            setIsPolling(false);
        }
        
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [booking.id, router, status, checkStatus]);

    // This state is very temporary, as the router.refresh() will load the actual ticket page.
    if (status === 'PAID') {
        return (
             <Alert className="max-w-md">
                <Ticket className="h-4 w-4" />
                <AlertTitle>Payment Confirmed!</AlertTitle>
                <AlertDescription>
                   Your payment has been successfully processed. Loading your ticket...
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
                    We are checking for payment confirmation. Your seats are reserved for a limited time. Please do not close this page.
                </AlertDescription>
                <div className="flex items-center justify-center pt-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </Alert>
        );
    }
    
    // This state is shown if polling times out or server confirms FAILED status
    if (status === 'FAILED') {
        return (
             <Alert variant="destructive" className="max-w-md">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Booking Expired or Failed</AlertTitle>
                <AlertDescription>
                   We could not confirm your payment in time, and the seats have been released. If you believe you have paid, please contact support.
                </AlertDescription>
                 <div className="pt-4 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => router.push('/')}>Go to Homepage</Button>
                    <Button onClick={() => router.push(`/book/${booking.routeId}`)}>Try Again</Button>
                </div>
            </Alert>
        )
    }

    // Fallback for any other state
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
