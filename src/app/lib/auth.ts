
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import type { User } from '@prisma/client';
import { cache } from 'react';

const secretKey = process.env.JWT_SECRET;
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (e) {
    return null;
  }
}

export async function createSession(userId: string) {
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    const session = await encrypt({ userId, expires });

    cookies().set('session', session, {
        expires,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'strict',
    });
}

export async function deleteSession() {
  cookies().set('session', '', { expires: new Date(0), path: '/' });
  cookies().set('csrf_token', '', { expires: new Date(0), path: '/' });
}

export const validateRequest = cache(async (): Promise<{ user: User | null; session: any | null }> => {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    if (!sessionCookie) {
        return { user: null, session: null };
    }

    const sessionPayload = await decrypt(sessionCookie);
    
    if (!sessionPayload || !sessionPayload.userId) {
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

    return { user: userWithoutPassword as User, session: sessionPayload };
});
