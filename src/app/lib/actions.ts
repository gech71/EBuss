'use server';

import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { Argon2id } from 'oslo/password';
import { lucia } from '@/app/lib/auth';
import type { ActionResult } from 'next/dist/server/app-render/types';
import { validateRequest } from './auth';
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
  let redirectUrl: string | null = null;
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

    // Create JWT
    const token = await new SignJWT({ 
        userId: existingUser.id, 
        role: existingUser.role,
        name: existingUser.name,
        email: existingUser.email
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h') // Token expires in 1 hour
      .sign(getJwtSecret());

    // Set JWT in cookie
    cookies().set('auth_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 // 1 hour
    });

    // Create Lucia session as well for server-side validation in layouts
    const session = await lucia.createSession(existingUser.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);


    if (existingUser.role === 'SUPER_ADMIN') {
      redirectUrl = '/super-admin';
    } else if (existingUser.role === 'ADMIN') {
      redirectUrl = '/admin';
    } else {
      redirectUrl = '/';
    }
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error;
    }
    return 'An unexpected error occurred.';
  }
  
  if(redirectUrl) {
    redirect(redirectUrl);
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
