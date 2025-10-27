
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import type { User } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const secretKey = process.env.JWT_SECRET;
const key = new TextEncoder().encode(secretKey);

const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

interface SessionPayload {
    userId: string;
    expiresAt: Date; // Absolute session expiry
    idleExpiresAt: Date; // Idle timeout
}

export async function encrypt(payload: SessionPayload) {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h') // Corresponds to SESSION_DURATION
    .sign(key);
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    // Manually reconstruct Date objects after deserialization
    return {
        ...payload,
        expiresAt: new Date(payload.expiresAt as string),
        idleExpiresAt: new Date(payload.idleExpiresAt as string),
    } as SessionPayload;
  } catch (e) {
    return null;
  }
}

export async function createSession(userId: string) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION);
    const idleExpiresAt = new Date(now.getTime() + IDLE_TIMEOUT);

    const sessionPayload: SessionPayload = { userId, expiresAt, idleExpiresAt };
    
    const session = await encrypt(sessionPayload);
	const sessionCookie = await cookies();
    sessionCookie.set('session', session, {
        expires: expiresAt,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'strict',
    });
}

export async function deleteSession() {
  const sessionCookie = await cookies();
  sessionCookie.set('session', '', { expires: new Date(0), path: '/' });
  sessionCookie.set('csrf_token', '', { expires: new Date(0), path: '/' });
}

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
    if (now > sessionPayload.expiresAt || now > sessionPayload.idleExpiresAt) {
        // Session or idle time has expired
        await deleteSession();
        return { user: null, session: null };
    }

    const user = await prisma.user.findUnique({
        where: { id: sessionPayload.userId },
    });
    
    if (!user) {
        return { user: null, session: null };
    }

    // Refresh idle timeout by creating a new token with an updated idleExpiresAt
    const newIdleExpiresAt = new Date(now.getTime() + IDLE_TIMEOUT);
    const newSessionPayload: SessionPayload = {
        ...sessionPayload,
        idleExpiresAt: newIdleExpiresAt,
    };
    const newSessionCookie = await encrypt(newSessionPayload);

    // Set the new session cookie
    cookieStore.set('session', newSessionCookie, {
        expires: newSessionPayload.expiresAt,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'strict',
    });


    // Omit hashed_password from the returned user object
    const { hashed_password, ...userWithoutPassword } = user;

    return { user: userWithoutPassword as User, session: sessionPayload };
};
