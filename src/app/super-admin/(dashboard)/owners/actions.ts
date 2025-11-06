
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { CommissionTier, CommissionType, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendCredentialsEmail } from '@/lib/server/email';

// Simple ID generator
function generateId(length: number): string {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}


const tierSchema = z.object({
  id: z.string().optional(),
  minSales: z.coerce.number().positive("Min Sales must be positive"),
  maxSales: z.coerce.number().positive("Max Sales must be positive"),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.coerce.number().positive("Value must be positive")
});

const bankAccountSchema = z.string()
    .length(13, "Bank account number must be exactly 13 digits.")
    .startsWith('7', "Bank account number must start with '7'.")
    .regex(/^\d+$/, "Bank account number must only contain digits.");

const createOwnerSchema = z.object({
  name: z.string().min(1, "Owner name cannot be empty."),
  email: z.string().email("Please enter a valid email address."),
  bankAccountNumber: bankAccountSchema,
  commissionTiers: z.array(tierSchema)
});

const updateOwnerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Owner name cannot be empty."),
  bankAccountNumber: bankAccountSchema,
  commissionTiers: z.array(tierSchema)
});

function generatePassword(length = 12) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let password = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        password += charset.charAt(Math.floor(crypto.randomInt(n)));
    }
    // Ensure password meets complexity requirements if any are needed
    if (!password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/)) {
        return generatePassword(length);
    }
    return password;
}

export async function createOwnerAction(formData: FormData) {
    const rawData = {
        name: formData.get('name'),
        email: formData.get('email'),
        bankAccountNumber: formData.get('bankAccountNumber'),
        commissionTiers: JSON.parse(formData.get('commissionTiers') as string)
    };

    const validatedData = createOwnerSchema.safeParse(rawData);

    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
        };
    }

    const { name, email, bankAccountNumber, commissionTiers } = validatedData.data;
    
    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const owner = await prisma.busOwner.create({
            data: {
                id: generateId(15),
                name,
                bankAccountNumber,
                commissionTiers: {
                    create: commissionTiers.map(tier => ({
                        minSales: tier.minSales,
                        maxSales: tier.maxSales,
                        type: tier.type,
                        value: tier.value,
                    }))
                }
            }
        });

        await prisma.user.create({
            data: {
                id: generateId(15),
                name: name, // Use owner name for the user's name
                email: email,
                hashed_password: hashedPassword,
                role: Role.ADMIN,
                busOwnerId: owner.id,
            }
        });

        // Send email with credentials
        await sendCredentialsEmail(email, password);

        revalidatePath('/super-admin/owners');
    
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unique constraint failed')) {
             if(error.message.includes('User_email_key')) {
                return { success: false, message: 'A user with this email already exists.' };
            }
            if(error.message.includes('BusOwner_name_key')) {
                return { success: false, message: 'A bus owner with this name already exists.' };
            }
             if(error.message.includes('BusOwner_bankAccountNumber_key')) {
                return { success: false, message: 'This bank account number is already registered.' };
            }
        }
        console.error("Error creating owner:", error);
        return { success: false, message: 'An unexpected error occurred while creating the owner.' };
    }

    redirect('/super-admin/owners');
}

export async function updateOwnerAction(formData: FormData) {
    const rawData = {
        id: formData.get('id'),
        name: formData.get('name'),
        bankAccountNumber: formData.get('bankAccountNumber'),
        commissionTiers: JSON.parse(formData.get('commissionTiers') as string)
    };

    const validatedData = updateOwnerSchema.safeParse(rawData);

    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
        };
    }

    const { id, name, bankAccountNumber, commissionTiers } = validatedData.data;

    try {
        await prisma.$transaction(async (tx) => {
            // Update owner name
            await tx.busOwner.update({
                where: { id },
                data: { name, bankAccountNumber }
            });

            // Delete existing tiers for this owner
            await tx.commissionTier.deleteMany({
                where: { busOwnerId: id }
            });

            // Create new tiers
            await tx.commissionTier.createMany({
                data: commissionTiers.map(tier => ({
                    minSales: tier.minSales,
                    maxSales: tier.maxSales,
                    type: tier.type as CommissionType,
                    value: tier.value,
                    busOwnerId: id
                }))
            });
        });

        revalidatePath('/super-admin/owners');
    
    } catch (error) {
        console.error("Error updating owner:", error);
        return { success: false, message: 'An unexpected error occurred while updating the owner.' };
    }

    redirect('/super-admin/owners');
}


export async function deleteOwnerAction(ownerId: string): Promise<{ success: boolean; message: string }> {
  try {
    // NOTE: Super admin actions don't have CSRF validation in this simplified implementation.
    // A production app should add this protection.

    // Check if the owner has any buses associated with them
    const busCount = await prisma.bus.count({
      where: {
        ownerId: ownerId,
      },
    });

    if (busCount > 0) {
      return {
        success: false,
        message: `This owner cannot be deleted because they have ${busCount} bus(es) assigned to them.`,
      };
    }
    
    // Check if any users are assigned to this owner
    const userCount = await prisma.user.count({
        where: {
            busOwnerId: ownerId
        }
    });

    if (userCount > 0) {
       return {
        success: false,
        message: `This owner cannot be deleted because they have ${userCount} user(s) assigned to them.`,
      };
    }

    // Since tiers are deleted with owner via cascading delete, we can just delete the owner
    await prisma.busOwner.delete({
      where: {
        id: ownerId,
      },
    });

    revalidatePath('/super-admin/owners');
    return { success: true, message: 'Owner has been deleted.' };
  } catch (error) {
    console.error('Error deleting owner:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
