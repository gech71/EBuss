'use server';

import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { Argon2id } from 'oslo/password';
import { lucia, validateRequest } from '@/app/lib/auth';
import type { ActionResult } from 'next/dist/server/app-render/types';
import { SignJWT } from 'jose';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
};


export async function authenticate(
  prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return 'Please provide all fields.';
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!existingUser || !existingUser.hashed_password) {
      return 'Invalid email or password.';
    }

    const validPassword = await new Argon2id().verify(
      existingUser.hashed_password,
      password
    );
    if (!validPassword) {
      return 'Invalid email or password.';
    }

    // 1. Create JWT for middleware
    const token = await new SignJWT({ 
        userId: existingUser.id, 
        role: existingUser.role,
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h') // Token expires in 1 hour
      .sign(getJwtSecret());

    // Set JWT in 'auth_session' cookie for the middleware
    cookies().set('auth_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 // 1 hour
    });

    // 2. Create Lucia session for server components
    const session = await lucia.createSession(existingUser.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

    // 3. Redirect after setting cookies
    if (existingUser.role === 'SUPER_ADMIN') {
      return redirect('/super-admin');
    } else if (existingUser.role === 'ADMIN') {
      return redirect('/admin');
    } else {
      return redirect('/');
    }
  } catch (error) {
    if (error instanceof Error && 'message' in error && error.message.includes('NEXT_REDIRECT')) {
      throw error;
    }
    console.error(error);
    return 'An unexpected error occurred.';
  }
}

export async function logout(): Promise<ActionResult> {
	const { session } = await validateRequest();
	if (!session) {
		return {
			error: "Unauthorized"
		};
	}

	await lucia.invalidateSession(session.id);

	const sessionCookie = lucia.createBlankSessionCookie();
	cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  
  // Also clear the JWT cookie
  cookies().set('auth_session', '', { expires: new Date(0), path: '/' });
	
  return redirect("/login");
}
