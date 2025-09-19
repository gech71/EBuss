
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Argon2id } from 'oslo/password';
import { Role } from '@prisma/client';

const createUserSchema = z.object({
  name: z.string().min(1, "Full name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters long."),
  ownerId: z.string().min(1, "Bus Owner is required."),
});

export async function createUserAction(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());

    const validatedData = createUserSchema.safeParse(rawData);

    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
        };
    }

    const { name, email, password, ownerId } = validatedData.data;

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
                busOwnerId: ownerId,
                role: Role.ADMIN
            }
        });

        revalidatePath('/super-admin/settings');
        return { success: true, message: 'User created successfully.' };

    } catch (error) {
        console.error("Error creating user:", error);
        return { success: false, message: 'An unexpected error occurred while creating the user.' };
    }
}
