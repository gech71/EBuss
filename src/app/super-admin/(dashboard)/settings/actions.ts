
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { validateRequest } from '@/lib/server/auth';
import { logAction } from '@/app/lib/logger';
import { sendCredentialsEmail } from '@/lib/server/email';
import { passwordPolicy } from '@/app/lib/password-policy';
import { validateCsrf } from '@/app/lib/actions';

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
    try {
        await validateCsrf(formData);
    } catch (error) {
        return { success: false, message: 'Your session has expired or is invalid. Please refresh the page and try again.' };
    }

    const { user: superAdmin } = await validateRequest();
    if (!superAdmin || superAdmin.role !== 'SUPER_ADMIN') {
        await logAction({ actionType: 'CREATE_ADMIN_USER_UNAUTHORIZED', description: 'Unauthorized attempt to create admin user.' });
        return { success: false, message: 'Unauthorized.' };
    }

    const rawData = Object.fromEntries(formData.entries());

    const validatedData = await createUserSchema.spa(rawData);

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
                role: Role.ADMIN,
                passwordChangeRequired: true, // Force password change on first login
            }
        });
        await logAction({ userId: superAdmin.id, actionType: 'CREATE_ADMIN_USER', description: `Created new admin user '${name}' (${newUser.id}) for owner ${ownerId}.` });
        
        try {
            await sendCredentialsEmail(email, email, password);
        } catch (emailError) {
            console.error("Failed to send credentials email for new admin user, but user was created successfully.", emailError);
            console.log(`DEV ONLY: Credentials for ${email} -> Password: ${password}`);
        }

        revalidatePath('/super-admin/settings');
        return { success: true, message: 'User created successfully.' };

    } catch (error) {
        await logAction({ userId: superAdmin.id, actionType: 'CREATE_ADMIN_USER_FAIL', description: `Error creating user. Error: ${error instanceof Error ? error.message : 'Unknown'}` });
        return { success: false, message: 'An unexpected error occurred while creating the user.' };
    }
}
