
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Argon2id } from 'oslo/password';
import { Role } from '@prisma/client';
import { generateId } from 'lucia';

const passwordPolicy = z.string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number.")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character.");

const createUserSchema = z.object({
  name: z.string().min(1, "Full name is required."),
  email: z.string().email("Invalid email address."),
  password: passwordPolicy,
  ownerId: z.string().min(1, "Bus Owner is required."),
});

export async function createUserAction(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());

    const validatedData = createUserSchema.safeParse(rawData);

    if (!validatedData.success) {
        const messages = validatedData.error.errors.map(e => {
            if (e.path.includes('password')) {
                return `Password: ${e.message}`;
            }
            return e.message;
        }).join('\n');
        return {
            success: false,
            message: messages,
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
        const userId = generateId(15);

        await prisma.user.create({
            data: {
                id: userId,
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
