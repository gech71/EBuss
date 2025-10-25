
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { PaymentStatus, BookingStatus } from '@prisma/client';

async function POST(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');

    // Extract the token from the string like: Bearer {token: YOUR_TOKEN}
    const tokenMatch = authHeader?.match(/token:\s*(.+)\s*}/);
    const rawToken = tokenMatch?.[1];

    // Reconstruct the standard Bearer token format
    const fixedAuthHeader = rawToken ? `Bearer ${rawToken}` : null;
    
    if (!fixedAuthHeader) {
    throw new Error('Invalid Authorization header format.');
    }
    const validationUrl = process.env.VALIDATE_TOKEN_URL;
    if (!validationUrl) {
        console.error('Callback Error: VALIDATE_TOKEN_URL is not set.');
        return NextResponse.json({ message: 'Server configuration error.' }, { status: 500 });
    }

    try {
        const externalResponse = await fetch(validationUrl, {
            method: 'GET',
            headers: { 'Authorization': fixedAuthHeader, 'Accept': 'application/json' },
            cache: 'no-store',
        });

        if (!externalResponse.ok) {
            const errorText = await externalResponse.text();
            console.error('Callback Error: External token validation failed.', { status: externalResponse.status, error: errorText });
            return NextResponse.json({ message: 'Invalid token.' }, { status: 401 });
        }
    } catch (error) {
        console.error('Callback Error: Failed to call validation URL.', error);
        return NextResponse.json({ message: 'Error validating token.' }, { status: 500 });
    }

    // 2. Parse the request body
    let requestBody;
    try {
        requestBody = await request.json();
    } catch (e) {
        console.error("Callback Error: Invalid JSON in request body.", e);
        return NextResponse.json({ message: "Invalid JSON format." }, { status: 400 });
    }

    const {
        paidAmount,
        paidByNumber,
        txnRef,
        transactionId,
        transactionTime,
        accountNo,
        token, // This is the user's auth token for the mini-app, not the payment token
        signature: receivedSignature
    } = requestBody;
    // 3. Process the payment and update database
    try {
        const payment = await prisma.payment.findUnique({
            where: { transactionId: txnRef }
        });

        if (!payment) {
            console.error(`Callback Error: Payment with transactionId ${txnRef} not found.`);
            return NextResponse.json({ message: 'Payment record not found.' }, { status: 404 });
        }

        if (payment.status === PaymentStatus.PAID) {
            return NextResponse.json({ message: 'Payment already processed.', bookingId: payment.bookingId }, { status: 200 });
        }
        
        await prisma.$transaction(async (tx) => {
            // Update Payment status
            await tx.payment.update({
                where: { id: payment.id },
                data: { 
                    status: PaymentStatus.PAID,
                    referenceNumber: transactionId,
                }
            });

            // Update Booking payment status
            await tx.booking.update({
                where: { id: payment.bookingId },
                data: { 
                    paymentStatus: PaymentStatus.PAID,
                    status: BookingStatus.VALID, // Mark booking as valid
                }
            });
        });
        
        return NextResponse.json({ message: "Payment confirmed and updated.", bookingId: payment.bookingId }, { status: 200 });

    } catch (error) {
        console.error('Callback Error: Failed to update database.', error);
        return NextResponse.json({ message: 'Database update failed.' }, { status: 500 });
    }
}

export { POST };
