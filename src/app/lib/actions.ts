
'use server';

import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
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


export async function authenticate(
  prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  // 1. CSRF Token Validation
  const csrfTokenFromForm = formData.get('csrfToken') as string;
  const csrfTokenFromCookie = cookies().get('csrf_token')?.value;

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
      return 'Invalid email or password.';
    }

    const validPassword = await new Argon2id().verify(
      existingUser.hashed_password,
      password
    );
    if (!validPassword) {
      return 'Invalid email or password.';
    }

    // CSRF token is valid, and user is authenticated. Invalidate CSRF token.
    cookies().set('csrf_token', '', { expires: new Date(0), path: '/' });

    // Create Lucia session for server components
    const session = await lucia.createSession(existingUser.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

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
	const { session } = await validateRequest();
	if (!session) {
		return {
			error: "Unauthorized"
		};
	}

	await lucia.invalidateSession(session.id);

	const sessionCookie = lucia.createBlankSessionCookie();
	cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  
  // Also clear the JWT cookie and any CSRF token
  cookies().set('auth_session', '', { expires: new Date(0), path: '/' });
  cookies().set('csrf_token', '', { expires: new Date(0), path: '/' });
	
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
        cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

        return { success: true, message: 'Password updated successfully. You have been logged out of other devices.' };

    } catch (error) {
        console.error("Error changing password:", error);
        return { success: false, message: 'An unexpected error occurred.' };
    }
}
