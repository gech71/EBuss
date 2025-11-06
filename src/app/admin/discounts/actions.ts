
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { validateRequest } from '@/lib/server/auth';
import { validateCsrf } from '@/app/lib/actions';
import { logAction } from '@/app/lib/logger';
import { DiscountType } from '@prisma/client';

const tierSchema = z.object({
  id: z.string().optional(),
  minTickets: z.coerce.number().int().positive(),
  maxTickets: z.coerce.number().int().positive(),
  percentage: z.coerce.number().positive(),
});

const discountSchema = z.object({
  name: z.string().min(1, "Discount name is required."),
  type: z.nativeEnum(DiscountType),
  startDate: z.string().transform((str) => new Date(str + 'T00:00:00.000Z')),
  endDate: z.string().transform((str) => new Date(str + 'T00:00:00.000Z')),
  percentage: z.coerce.number().optional(),
  tiers: z.array(tierSchema).optional(),
});

export async function createDiscountAction(formData: FormData) {
    await validateCsrf(formData.get('csrfToken') as string);
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        await logAction({ actionType: 'CREATE_DISCOUNT_ATTEMPT_FAIL', description: 'Unauthorized attempt to create discount.' });
        return { success: false, message: 'Unauthorized' };
    }

    const type = formData.get('type') as DiscountType;
    const rawData = {
        name: formData.get('name'),
        type: type,
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        percentage: type === 'DATE_BASED' ? formData.get('percentage') : undefined,
        tiers: type === 'TICKET_COUNT_BASED' ? JSON.parse(formData.get('tiers') as string) : undefined,
    };

    const validatedData = discountSchema.safeParse(rawData);
    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
        };
    }
    
    const { name, startDate, endDate, tiers, percentage } = validatedData.data;

    try {
        const newDiscount = await prisma.discount.create({
            data: {
                name,
                type,
                startDate,
                endDate,
                percentage: type === 'DATE_BASED' ? percentage : null,
                ownerId: user.busOwnerId,
                tiers: {
                    create: type === 'TICKET_COUNT_BASED' && tiers ? tiers.map(tier => ({
                        minTickets: tier.minTickets,
                        maxTickets: tier.maxTickets,
                        percentage: tier.percentage,
                    })) : undefined
                }
            }
        });
        await logAction({ userId: user.id, actionType: 'CREATE_DISCOUNT', description: `Created discount '${name}' (${newDiscount.id}).` });
    } catch (error) {
        await logAction({ userId: user.id, actionType: 'CREATE_DISCOUNT_FAIL', description: `Failed to create discount '${name}'. Error: ${error instanceof Error ? error.message : 'Unknown'}` });
        return { success: false, message: 'An unexpected error occurred.' };
    }
    
    revalidatePath('/admin/discounts');
    redirect('/admin/discounts');
}

export async function updateDiscountAction(formData: FormData) {
    await validateCsrf(formData.get('csrfToken') as string);
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        await logAction({ actionType: 'UPDATE_DISCOUNT_ATTEMPT_FAIL', description: 'Unauthorized attempt to update discount.' });
        return { success: false, message: 'Unauthorized' };
    }
    
    const discountId = formData.get('id') as string;
    const type = formData.get('type') as DiscountType;

    const rawData = {
        name: formData.get('name'),
        type: type,
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        percentage: type === 'DATE_BASED' ? formData.get('percentage') : undefined,
        tiers: type === 'TICKET_COUNT_BASED' ? JSON.parse(formData.get('tiers') as string) : undefined,
    };

    const validatedData = discountSchema.safeParse(rawData);
    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
        };
    }
    
    const { name, startDate, endDate, tiers, percentage } = validatedData.data;

    try {
        await prisma.$transaction(async (tx) => {
            const discount = await tx.discount.findFirst({
                where: { id: discountId, ownerId: user.busOwnerId }
            });

            if (!discount) {
                throw new Error("Discount not found or you don't have permission to edit it.");
            }
            
            await tx.discount.update({
                where: { 
                    id: discountId,
                    ownerId: user.busOwnerId
                },
                data: { 
                    name, 
                    startDate, 
                    endDate, 
                    type, 
                    percentage: type === 'DATE_BASED' ? percentage : null,
                }
            });
            
            // Always delete old tiers, new ones will be created if applicable
            await tx.discountTier.deleteMany({
                where: { discountId: discountId }
            });
            
            if (type === 'TICKET_COUNT_BASED' && tiers) {
                await tx.discountTier.createMany({
                    data: tiers.map(tier => ({
                        minTickets: tier.minTickets,
                        maxTickets: tier.maxTickets,
                        percentage: tier.percentage,
                        discountId: discountId,
                    }))
                });
            }
        });
        await logAction({ userId: user.id, actionType: 'UPDATE_DISCOUNT', description: `Updated discount '${name}' (${discountId}).` });
    } catch (error) {
         const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
         await logAction({ userId: user.id, actionType: 'UPDATE_DISCOUNT_FAIL', description: `Failed to update discount ${discountId}. Error: ${message}` });
        return { success: false, message };
    }

    revalidatePath('/admin/discounts');
    redirect('/admin/discounts');
}

export async function deleteDiscountAction(discountId: string, csrfToken: string): Promise<{ success: boolean; message: string }> {
    await validateCsrf(csrfToken);

    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        await logAction({ actionType: 'DELETE_DISCOUNT_ATTEMPT_FAIL', description: `Unauthorized attempt to delete discount ${discountId}.` });
        return { success: false, message: 'Unauthorized' };
    }

    try {
        const discount = await prisma.discount.findFirst({
            where: { id: discountId, ownerId: user.busOwnerId }
        });

        if (!discount) {
            return { success: false, message: 'Discount not found or you do not have permission to delete it.' };
        }

        await prisma.route.updateMany({
            where: { discountId: discountId },
            data: { discountId: null }
        });

        await prisma.discount.delete({
            where: { 
                id: discountId,
                ownerId: user.busOwnerId
            }
        });

        await logAction({ userId: user.id, actionType: 'DELETE_DISCOUNT', description: `Deleted discount ${discountId}.` });
        revalidatePath('/admin/discounts');
        return { success: true, message: 'Discount has been deleted.' };
    } catch (error) {
        await logAction({ userId: user.id, actionType: 'DELETE_DISCOUNT_FAIL', description: `Error deleting discount ${discountId}. Error: ${error instanceof Error ? error.message : 'Unknown'}` });
        return { success: false, message: 'An unexpected error occurred.' };
    }
}
