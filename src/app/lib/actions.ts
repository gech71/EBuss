'use server';

import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { Argon2id } from 'oslo/password';
import { SignJWT } from 'jose';
import { lucia } from '@/app/lib/auth';
import { validateRequest } from '@/app/lib/auth';
import { ActionResult } from 'next/dist/server/app-render/types';

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

    // Create JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const alg = 'HS256';
    const jwt = await new SignJWT({ 
        userId: existingUser.id, 
        role: existingUser.role,
        name: existingUser.name,
        email: existingUser.email
    })
      .setProtectedHeader({ alg })
      .setExpirationTime('24h')
      .setIssuedAt()
      .sign(secret);

    // Set cookie
    cookies().set('auth_session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    if (existingUser.role === 'SUPER_ADMIN') {
      return redirect('/super-admin');
    } else if (existingUser.role === 'ADMIN') {
      return redirect('/admin');
    } else {
      return redirect('/');
    }
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes('redirect')) {
      throw error;
    }
    return 'An unexpected error occurred.';
  }
}

export async function logout(): Promise<ActionResult> {
	cookies().delete("auth_session");
	return redirect("/login");
}
