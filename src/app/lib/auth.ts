
'use server';

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import type { User } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { SESSION_DURATION } from './constants';

const secretKey = process.env.JWT_SECRET;
const key = new TextEncoder().encode(secretKey);


// Simple ID generator
function generateId(length: number): string {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}


export interface SessionPayload {
    userId: string;
    jti: string; // JWT ID - links the JWT to the database session
    expiresAt: Date; // Absolute session expiry
    passwordChangeRequired: boolean;
}

export async function encrypt(payload: SessionPayload) {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setJti(payload.jti)
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
        userId: payload.userId as string,
        jti: payload.jti as string,
        expiresAt: new Date(payload.expiresAt as string),
        passwordChangeRequired: payload.passwordChangeRequired as boolean,
    } as SessionPayload;
  } catch (e) {
    return null;
  }
}

export async function createSession(userId: string, passwordChangeRequired: boolean) {
    const expiresAt = new Date(Date.now() + SESSION_DURATION);
    const sessionId = generateId(40);
    
    // Create a session record in the database
    const sessionRecord = await prisma.session.create({
        data: {
            id: sessionId,
            userId: userId,
            expiresAt: expiresAt,
        }
    });

    const sessionPayload: SessionPayload = { 
        userId, 
        jti: sessionRecord.id, // Use the DB record's ID as the JWT ID
        expiresAt, 
        passwordChangeRequired 
    };
    
    const sessionJwt = await encrypt(sessionPayload);
	const sessionCookie = await cookies();
    sessionCookie.set('session', sessionJwt, {
        expires: expiresAt,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'strict',
    });
}

export async function deleteSession(jti: string | undefined) {
  if (jti) {
      try {
        // Invalidate the session in the database
        await prisma.session.delete({
            where: { id: jti }
        });
      } catch (error) {
        // Ignore errors if session doesn't exist, etc.
        console.error("Failed to delete session from DB:", error);
      }
  }
  // Always clear the cookie
  const sessionCookie = await cookies();
  sessionCookie.set('session', '', { expires: new Date(0), path: '/' });
  sessionCookie.set('csrf_token', '', { expires: new Date(0), path: '/' });
}
