'use server';

import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { Argon2id } from 'oslo/password';
import { lucia } from '@/app/lib/auth';
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
    console.error(error);
    if (error instanceof Error && error.message.includes('redirect')) {
      throw error;
    }
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
	return redirect("/login");
}
