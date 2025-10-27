
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { validateRequest } from '@/lib/server/auth';
import { logAction } from '@/app/lib/logger';

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

// A simple function to generate a random ID
function generateId(length: number): string {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}


export async function createUserAction(formData: FormData) {
    const { user: superAdmin } = await validateRequest();
    if (!superAdmin || superAdmin.role !== 'SUPER_ADMIN') {
        await logAction({ actionType: 'CREATE_ADMIN_USER_UNAUTHORIZED', description: 'Unauthorized attempt to create admin user.' });
        return { success: false, message: 'Unauthorized.' };
    }

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

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = generateId(15);

        const newUser = await prisma.user.create({
            data: {
                id: userId,
                name,
                email: email.toLowerCase(),
                hashed_password: hashedPassword,
                busOwnerId: ownerId,
                role: Role.ADMIN
            }
        });
        await logAction({ userId: superAdmin.id, actionType: 'CREATE_ADMIN_USER', description: `Created new admin user '${name}' (${newUser.id}) for owner ${ownerId}.` });

        revalidatePath('/super-admin/settings');
        return { success: true, message: 'User created successfully.' };

    } catch (error) {
        await logAction({ userId: superAdmin.id, actionType: 'CREATE_ADMIN_USER_FAIL', description: `Error creating user. Error: ${error instanceof Error ? error.message : 'Unknown'}` });
        return { success: false, message: 'An unexpected error occurred while creating the user.' };
    }
}
