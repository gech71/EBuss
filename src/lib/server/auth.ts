

'use server';

import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import type { User } from '@prisma/client';
import { decrypt, SessionPayload } from '@/app/lib/auth';

export async function validateRequest(): Promise<{ user: User | null; session: SessionPayload | null; }> {
    const cookieStore = await cookies();
    const sessionCookieValue = cookieStore.get('session')?.value;
    
    if (!sessionCookieValue) {
        return { user: null, session: null };
    }

    const sessionPayload = await decrypt(sessionCookieValue);
    
    if (!sessionPayload || !sessionPayload.userId) {
        return { user: null, session: null };
    }
    
    const now = new Date();
    if (now > new Date(sessionPayload.expiresAt) || now > new Date(sessionPayload.idleExpiresAt)) {
        // Session or idle time has expired
        return { user: null, session: null };
    }

    const user = await prisma.user.findUnique({
        where: { id: sessionPayload.userId },
    });
    
    if (!user) {
        return { user: null, session: null };
    }

    // Omit hashed_password from the returned user object
    const { hashed_password, ...userWithoutPassword } = user;

    // The user object returned now includes the `passwordChangeRequired` flag
    return { user: userWithoutPassword as User, session: sessionPayload };
};


