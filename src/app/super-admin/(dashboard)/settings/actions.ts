'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { validateRequest } from '@/lib/server/auth';
import { logAction } from '@/app/lib/logger';
import { sendPasswordSetupEmail } from '@/lib/server/email';
import { validateCsrf } from '@/app/lib/actions';
import crypto from 'crypto';

const createUserSchema = z.object({
  name: z.string().min(1, "Full name is required."),
  email: z.string().email("Invalid email address."),
  ownerId: z.string().min(1, "Bus Owner is required."),
});

// A simple function to generate a random ID
function generateId(length: number): string {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
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
        const messages = validatedData.error.errors.map(e => e.message).join('\n');
        return {
            success: false,
            message: messages,
        };
    }

    const { name, email, ownerId } = validatedData.data;

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            return { success: false, message: 'A user with this email already exists.' };
        }

        const setupToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(setupToken).digest('hex');
        const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        const newUser = await prisma.user.create({
            data: {
                id: generateId(15),
                name,
                email: email.toLowerCase(),
                busOwnerId: ownerId,
                role: Role.ADMIN,
                passwordSetupToken: hashedToken,
                passwordSetupExpires: tokenExpires,
            }
        });
        await logAction({ userId: superAdmin.id, actionType: 'CREATE_ADMIN_USER', description: `Created new admin user '${name}' (${newUser.id}) for owner ${ownerId}.` });
        
        try {
            await sendPasswordSetupEmail(email, setupToken);
        } catch (emailError) {
            console.error("Failed to send setup email for new admin user, but user was created successfully.", emailError);
            console.log(`DEV ONLY: Setup token for ${email} -> ${setupToken}`);
        }

        revalidatePath('/super-admin/settings');
        return { success: true, message: 'User created successfully. A setup email has been sent.' };

    } catch (error) {
        await logAction({ userId: superAdmin.id, actionType: 'CREATE_ADMIN_USER_FAIL', description: `Error creating user. Error: ${error instanceof Error ? error.message : 'Unknown'}` });
        return { success: false, message: 'An unexpected error occurred while creating the user.' };
    }
}
