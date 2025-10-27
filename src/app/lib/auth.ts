
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import type { User } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const secretKey = process.env.JWT_SECRET;
const key = new TextEncoder().encode(secretKey);

export const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
export const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export interface SessionPayload {
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
