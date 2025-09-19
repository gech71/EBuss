
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { CommissionTier, CommissionType } from '@prisma/client';


const tierSchema = z.object({
  id: z.string().optional(),
  minSales: z.number().positive("Min Sales must be positive"),
  maxSales: z.number().positive("Max Sales must be positive"),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().positive("Value must be positive")
});

const ownerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Owner name cannot be empty."),
  commissionTiers: z.array(tierSchema)
});


export async function updateOwnerAction(formData: FormData) {
    const rawData = {
        id: formData.get('id'),
        name: formData.get('name'),
        commissionTiers: JSON.parse(formData.get('commissionTiers') as string)
    };

    const validatedData = ownerSchema.safeParse(rawData);

    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
        };
    }

    const { id, name, commissionTiers } = validatedData.data;

    try {
        await prisma.$transaction(async (tx) => {
            // Update owner name
            await tx.busOwner.update({
                where: { id },
                data: { name }
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
                    type: tier.type,
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

