
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Argon2id } from 'oslo/password';
import { Role } from '@prisma/client';

const registerSchema = z.object({
  name: z.string().min(1, "Full name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters long."),
});

export async function registerAction(prevState: any, formData: FormData) {
    const validatedData = registerSchema.safeParse(Object.fromEntries(formData));

    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
        };
    }

    const { name, email, password } = validatedData.data;

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            return { success: false, message: 'A user with this email already exists.' };
        }

        const hashedPassword = await new Argon2id().hash(password);

        await prisma.user.create({
            data: {
                name,
                email: email.toLowerCase(),
                hashed_password: hashedPassword,
                role: Role.CUSTOMER // Default role for public registration
            }
        });

        revalidatePath('/');
        return { success: true, message: 'You can now log in with your new account.' };

    } catch (error) {
        console.error("Error creating user:", error);
        return { success: false, message: 'An unexpected error occurred.' };
    }
}
