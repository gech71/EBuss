

'use server';

import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import type { User } from '@prisma/client';
import { decrypt, SessionPayload } from '@/app/lib/auth';
import { SESSION_DURATION } from '@/app/lib/constants';

export async function validateRequest(): Promise<{ user: User | null; session: SessionPayload | null; }> {
    const cookieStore = await cookies();
    const sessionCookieValue = cookieStore.get('session')?.value;
    
    if (!sessionCookieValue) {
        return { user: null, session: null };
    }

    const sessionPayload = await decrypt(sessionCookieValue);
    
    if (!sessionPayload || !sessionPayload.jti) {
        return { user: null, session: null };
    }
    
    // Validate against the database and "slide" the session expiration
    try {
        const dbSession = await prisma.session.findUnique({
            where: { id: sessionPayload.jti }
        });

        if (!dbSession) {
            return { user: null, session: null };
        }

        const now = new Date();
        if (now > new Date(dbSession.expiresAt)) {
            // Session has expired, delete it from the DB
            await prisma.session.delete({ where: { id: dbSession.id }});
            return { user: null, session: null };
        }
        
        // --- Sliding Session Logic ---
        // Update the session expiration time in the database to extend it
        const newExpiresAt = new Date(Date.now() + SESSION_DURATION);
        await prisma.session.update({
            where: { id: dbSession.id },
            data: { expiresAt: newExpiresAt }
        });
        
        const user = await prisma.user.findUnique({
            where: { id: sessionPayload.userId },
        });
        
        if (!user) {
            return { user: null, session: null };
        }

        // Omit hashed_password from the returned user object
        const { hashed_password, ...userWithoutPassword } = user;

        return { user: userWithoutPassword as User, session: sessionPayload };

    } catch (error) {
        console.error("Session validation error:", error);
        return { user: null, session: null };
    }
};





