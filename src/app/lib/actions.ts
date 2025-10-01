
'use server';

import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { Argon2id } from 'oslo/password';
import { lucia, validateRequest } from '@/app/lib/auth';
import { z } from 'zod';

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
    
    const session = await lucia.createSession(existingUser.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

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

export async function logout() {
	const { session } = await validateRequest();
	if (!session) {
		return {
			error: "Unauthorized"
		};
	}

	await lucia.invalidateSession(session.id);

	const sessionCookie = lucia.createBlankSessionCookie();
	cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  
  return redirect("/login");
}

const registerUserSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
});

export async function registerUserAction(prevState: string | undefined, formData: FormData) {
  const validatedFields = registerUserSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return validatedFields.error.errors.map(e => e.message).join(', ');
  }

  const { name, email, password } = validatedFields.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return 'A user with this email already exists.';
    }

    const hashedPassword = await new Argon2id().hash(password);

    await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        hashed_password: hashedPassword,
        role: 'CUSTOMER' 
      },
    });

  } catch (error) {
    console.error('Registration error:', error);
    return 'An unexpected error occurred.';
  }

  redirect('/login');
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
