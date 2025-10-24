
'use server';

import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { cookies, headers } from 'next/headers';
import { Argon2id } from 'oslo/password';
import { lucia, validateRequest } from '@/app/lib/auth';
import type { ActionResult } from 'next/dist/server/app-render/types';
import { z } from 'zod';

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPT_WINDOW_SECONDS = 60;

function getIP() {
    const forwardedFor = headers().get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    const realIp = headers().get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }
    return null;
}

export async function validateCsrf(tokenFromRequest: string | FormData) {
    const cookieStore = await cookies();
    const tokenFromCookie = cookieStore.get('csrf_token')?.value;

    let token: string | null;

    if (tokenFromRequest instanceof FormData) {
        token = tokenFromRequest.get('csrfToken') as string | null;
    } else {
        token = tokenFromRequest;
    }

    if (!token || !tokenFromCookie || token !== tokenFromCookie) {
        throw new Error('Invalid CSRF token.');
    }
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


  try {
    await validateCsrf(formData);

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

    const session = await lucia.createSession(existingUser.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

    let redirectPath = '/';
    if (existingUser.role === 'SUPER_ADMIN') {
      redirectPath = '/super-admin';
    } else if (existingUser.role === 'ADMIN') {
      redirectPath = '/admin';
    }
    
    redirect(redirectPath);
    return 'success';

  } catch (error) {
    if (error instanceof Error) {
       if (error.message.includes('NEXT_REDIRECT')) {
         throw error;
       }
       return error.message;
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
  
  cookieStore.set('csrf_token', '', { expires: new Date(0), path: '/' });
	
  return redirect("/login");
}

const passwordPolicy = z.string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number.")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character.");


const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: passwordPolicy,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match.',
    path: ['confirmPassword'],
});


export async function changePasswordAction(formData: FormData) {
    await validateCsrf(formData);
    const cookieStore = await cookies();
    const { user, session } = await validateRequest();
    if (!user || !session) {
        return { success: false, message: 'Unauthorized' };
    }

    const validatedData = changePasswordSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedData.success) {
        const messages = validatedData.error.errors.map(e => {
            if (e.path.includes('newPassword')) {
                return `New Password: ${e.message}`;
            }
            return e.message;
        }).join('\n');
        return {
            success: false,
            message: messages
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
        
        await lucia.invalidateUserSessions(user.id);

        await prisma.user.update({
            where: { id: user.id },
            data: { hashed_password: newHashedPassword }
        });
        
        const newSession = await lucia.createSession(user.id, {});
        const sessionCookie = lucia.createSessionCookie(newSession.id);
        cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

        return { success: true, message: 'Password updated successfully. You have been logged out of other devices.' };

    } catch (error) {
        console.error("Error changing password:", error);
        return { success: false, message: 'An unexpected error occurred.' };
    }
}
