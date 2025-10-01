
'use server';

import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { cookies, headers } from 'next/headers';
import { Argon2id } from 'oslo/password';
import { lucia, validateRequest } from '@/app/lib/auth';
import type { ActionResult } from 'next/dist/server/app-render/types';
import { SignJWT } from 'jose';
import { z } from 'zod';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPT_WINDOW_SECONDS = 60;

async function getIP() {
  const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    const realIp = requestHeaders.get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }
    return null;
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const cookieStore = await cookies();
  const ip = getIP();

  if (ip) {
      const now = new Date();
      const windowStart = new Date(now.getTime() - LOGIN_ATTEMPT_WINDOW_SECONDS * 1000);
      
      const attempts = await prisma.loginAttempt.findMany({
          where: {
              ipAddress: ip,
              timestamp: { gte: windowStart }
          },
          orderBy: { timestamp: 'asc' }
      });
      
      if (attempts.length >= MAX_LOGIN_ATTEMPTS) {
          const firstAttemptTime = attempts[0].timestamp.getTime();
          const timeLeft = Math.ceil((firstAttemptTime + (LOGIN_ATTEMPT_WINDOW_SECONDS * 1000) - now.getTime()) / 1000);
          return `Too many login attempts. Please try again in ${timeLeft} seconds.`;
      }
  }


  // 1. CSRF Token Validation
  const csrfTokenFromForm = formData.get('csrfToken') as string;
  const csrfTokenFromCookie = cookieStore.get('csrf_token')?.value;

  if (!csrfTokenFromForm || !csrfTokenFromCookie || csrfTokenFromForm !== csrfTokenFromCookie) {
    return 'Invalid session. Please try logging in again.';
  }

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
      if (ip) {
        await prisma.loginAttempt.create({ data: { ipAddress: ip }});
      }
      return 'Invalid email or password.';
    }

    const validPassword = await new Argon2id().verify(
      existingUser.hashed_password,
      password
    );
    if (!validPassword) {
      if (ip) {
        await prisma.loginAttempt.create({ data: { ipAddress: ip }});
      }
      return 'Invalid email or password.';
    }

    // CSRF token is valid, and user is authenticated. Invalidate CSRF token.
    cookieStore.set('csrf_token', '', { expires: new Date(0), path: '/' });

    // Create Lucia session for server components
    const session = await lucia.createSession(existingUser.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

    // Redirect after setting cookies
    let redirectPath = '/';
    if (existingUser.role === 'SUPER_ADMIN') {
      redirectPath = '/super-admin';
    } else if (existingUser.role === 'ADMIN') {
      redirectPath = '/admin';
    }
    
    // Instead of calling redirect() which throws an error, return a success message.
    // The client will handle the navigation.
    redirect(redirectPath);
    // This part will not be reached due to redirect, but as a fallback:
    return 'success';

  } catch (error) {
    if (error instanceof Error && 'message' in error && error.message.includes('NEXT_REDIRECT')) {
      throw error;
    }
    console.error(error);
    return 'An unexpected error occurred.';
  }
}

export async function logout(): Promise<ActionResult> {
  const cookieStore = await cookies();
	const { session } = await validateRequest();
	if (!session) {
		return {
			error: "Unauthorized"
		};
	}

	await lucia.invalidateSession(session.id);

	const sessionCookie = lucia.createBlankSessionCookie();
	cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  
  // Also clear the JWT cookie and any CSRF token
  cookieStore.set('auth_session', '', { expires: new Date(0), path: '/' });
  cookieStore.set('csrf_token', '', { expires: new Date(0), path: '/' });
	
  return redirect("/login");
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters.'),
  confirmPassword: z.string().min(6, 'Please confirm your new password.'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match.',
    path: ['confirmPassword'],
});


export async function changePasswordAction(formData: FormData) {
    const cookieStore = await cookies();
    const { user, session } = await validateRequest();
    if (!user || !session) {
        return { success: false, message: 'Unauthorized' };
    }

    const validatedData = changePasswordSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
        };
    }

    const { currentPassword, newPassword } = validatedData.data;

    try {
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id }
        });

        if (!dbUser || !dbUser.hashed_password) {
             return { success: false, message: 'User not found.' };
        }
        
        const validPassword = await new Argon2id().verify(
            dbUser.hashed_password,
            currentPassword
        );

        if (!validPassword) {
            return { success: false, message: 'Incorrect current password.' };
        }

        const newHashedPassword = await new Argon2id().hash(newPassword);
        
        // Invalidate all other sessions for security
        await lucia.invalidateUserSessions(user.id);

        await prisma.user.update({
            where: { id: user.id },
            data: { hashed_password: newHashedPassword }
        });
        
        // Create a new session after password change
        const newSession = await lucia.createSession(user.id, {});
        const sessionCookie = lucia.createSessionCookie(newSession.id);
        cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

        return { success: true, message: 'Password updated successfully. You have been logged out of other devices.' };

    } catch (error) {
        console.error("Error changing password:", error);
        return { success: false, message: 'An unexpected error occurred.' };
    }
}
