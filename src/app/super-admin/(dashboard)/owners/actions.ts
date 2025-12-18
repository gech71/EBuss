
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { CommissionType, Role } from '@prisma/client';
import { validateRequest } from '@/lib/server/auth';
import { logAction } from '@/app/lib/logger';
import { validateCsrf } from '@/app/lib/actions';
import crypto from 'crypto';

// Simple ID generator
function generateId(length: number): string {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
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
  bankAccountNumber: bankAccountSchema,
  commissionTiers: z.array(tierSchema)
});

const updateOwnerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Owner name cannot be empty."),
  bankAccountNumber: bankAccountSchema,
  commissionTiers: z.array(tierSchema)
});

export async function createOwnerAction(formData: FormData) {
    try {
        await validateCsrf(formData);
    } catch (error) {
        return { success: false, message: 'Your session has expired or is invalid. Please refresh the page and try again.' };
    }

    const { user } = await validateRequest();
    if (!user || user.role !== 'SUPER_ADMIN') {
        await logAction({ actionType: 'CREATE_OWNER_UNAUTHORIZED', description: 'Unauthorized attempt to create bus owner.' });
        return { success: false, message: 'Unauthorized' };
    }
    
    const rawData = {
        name: formData.get('name'),
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

    const { name, bankAccountNumber, commissionTiers } = validatedData.data;

    try {
        const newOwner = await prisma.busOwner.create({
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
        await logAction({ 
            userId: user.id, 
            actionType: 'CREATE_OWNER', 
            description: `Created bus owner '${name}'`,
            details: { newOwner } 
        });
        revalidatePath('/super-admin/owners');
    
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await logAction({ 
            userId: user.id, 
            actionType: 'CREATE_OWNER_FAIL', 
            description: `Failed to create owner '${name}'.`,
            details: { error: message, attemptedData: validatedData.data }
        });
        if (error instanceof Error && error.message.includes('Unique constraint failed')) {
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
     try {
        await validateCsrf(formData);
    } catch (error) {
        return { success: false, message: 'Your session has expired or is invalid. Please refresh the page and try again.' };
    }

    const { user } = await validateRequest();
    if (!user || user.role !== 'SUPER_ADMIN') {
        await logAction({ actionType: 'UPDATE_OWNER_UNAUTHORIZED', description: 'Unauthorized attempt to update bus owner.' });
        return { success: false, message: 'Unauthorized' };
    }

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
        const oldOwner = await prisma.busOwner.findUnique({
            where: { id },
            include: { commissionTiers: true }
        });

        if (!oldOwner) {
            throw new Error("Owner not found");
        }

        await prisma.$transaction(async (tx) => {
            await tx.busOwner.update({
                where: { id },
                data: { name, bankAccountNumber }
            });
            await tx.commissionTier.deleteMany({
                where: { busOwnerId: id }
            });
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

        const newOwner = { id, name, bankAccountNumber, commissionTiers };

        await logAction({ 
            userId: user.id, 
            actionType: 'UPDATE_OWNER', 
            description: `Updated bus owner '${name}' (${id}).`,
            details: { oldValue: oldOwner, newValue: newOwner }
        });
        revalidatePath('/super-admin/owners');
    
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await logAction({ 
            userId: user.id, 
            actionType: 'UPDATE_OWNER_FAIL', 
            description: `Failed to update owner '${name}' (${id}).`,
            details: { error: message, attemptedData: validatedData.data }
        });
        console.error("Error updating owner:", error);
        return { success: false, message: 'An unexpected error occurred while updating the owner.' };
    }

    redirect('/super-admin/owners');
}


export async function deleteOwnerAction(ownerId: string, csrfToken: string): Promise<{ success: boolean; message: string }> {
  try {
    await validateCsrf(csrfToken);
  } catch (error) {
    return { success: false, message: 'Your session has expired or is invalid. Please refresh the page and try again.' };
  }
  
  const { user } = await validateRequest();
  if (!user || user.role !== 'SUPER_ADMIN') {
    await logAction({ actionType: 'DELETE_OWNER_UNAUTHORIZED', description: `Unauthorized attempt to delete owner ${ownerId}.` });
    return { success: false, message: 'Unauthorized' };
  }

  try {
    const ownerToDelete = await prisma.busOwner.findUnique({
        where: { id: ownerId },
        include: { _count: { select: { buses: true, admins: true }}}
    });

    if (!ownerToDelete) {
        await logAction({ userId: user.id, actionType: 'DELETE_OWNER_FAIL', description: `Attempted to delete non-existent owner ${ownerId}.`});
        return { success: false, message: "Owner not found."};
    }
    
    const busCount = ownerToDelete._count.buses;
    if (busCount > 0) {
      await logAction({ userId: user.id, actionType: 'DELETE_OWNER_FAIL', description: `Attempted to delete owner ${ownerId}, but they have ${busCount} buses.`, details: { owner: ownerToDelete } });
      return {
        success: false,
        message: `This owner cannot be deleted because they have ${busCount} bus(es) assigned to them.`,
      };
    }
    
    const userCount = ownerToDelete._count.admins;
    if (userCount > 0) {
       await logAction({ userId: user.id, actionType: 'DELETE_OWNER_FAIL', description: `Attempted to delete owner ${ownerId}, but they have ${userCount} users.`, details: { owner: ownerToDelete } });
       return {
        success: false,
        message: `This owner cannot be deleted because they have ${userCount} user(s) assigned to them.`,
      };
    }

    await prisma.busOwner.delete({
      where: {
        id: ownerId,
      },
    });
    
    await logAction({ userId: user.id, actionType: 'DELETE_OWNER', description: `Successfully deleted owner ${ownerToDelete.name} (${ownerId}).`, details: { deletedOwner: ownerToDelete } });
    revalidatePath('/super-admin/owners');
    return { success: true, message: 'Owner has been deleted.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await logAction({ userId: user.id, actionType: 'DELETE_OWNER_FAIL', description: `Error deleting owner ${ownerId}.`, details: { error: message } });
    console.error('Error deleting owner:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
