
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { validateRequest } from '@/lib/server/auth';
import { validateCsrf } from '@/app/lib/actions';
import { logAction } from '@/app/lib/logger';

const tierSchema = z.object({
  id: z.string().optional(),
  minTickets: z.coerce.number().int().positive(),
  maxTickets: z.coerce.number().int().positive(),
  percentage: z.coerce.number().positive(),
});

// Use string for dates to handle them manually and avoid timezone issues with Zod's coerce.date()
const discountSchema = z.object({
  name: z.string().min(1, "Discount name is required."),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().min(1, "End date is required."),
  tiers: z.array(tierSchema).min(1, "At least one discount tier is required."),
});

// Helper to ensure dates from the client (which are date-only strings) are correctly interpreted as UTC dates.
const createUtcDate = (dateStr: string) => {
    // We expect a string like "2025-11-05T00:00:00.000Z" from the form.
    // Directly creating a new Date from this ISO string is reliable.
    return new Date(dateStr);
}

export async function createDiscountAction(formData: FormData) {
    await validateCsrf(formData.get('csrfToken') as string);
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        await logAction({ actionType: 'CREATE_DISCOUNT_ATTEMPT_FAIL', description: 'Unauthorized attempt to create discount.' });
        return { success: false, message: 'Unauthorized' };
    }

    const rawData = {
        name: formData.get('name'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        tiers: JSON.parse(formData.get('tiers') as string),
    };

    const validatedData = discountSchema.safeParse(rawData);
    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
        };
    }

    const { name, startDate, endDate, tiers } = validatedData.data;
    
    const finalStartDate = createUtcDate(startDate);
    const finalEndDate = createUtcDate(endDate);

    try {
        const newDiscount = await prisma.discount.create({
            data: {
                name,
                startDate: finalStartDate,
                endDate: finalEndDate,
                ownerId: user.busOwnerId,
                tiers: {
                    create: tiers.map(tier => ({
                        minTickets: tier.minTickets,
                        maxTickets: tier.maxTickets,
                        percentage: tier.percentage,
                    }))
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

    const rawData = {
        name: formData.get('name'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        tiers: JSON.parse(formData.get('tiers') as string),
    };

    const validatedData = discountSchema.safeParse(rawData);
    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
        };
    }
    
    const { name, startDate, endDate, tiers } = validatedData.data;

    const finalStartDate = createUtcDate(startDate);
    const finalEndDate = createUtcDate(endDate);

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
                    startDate: finalStartDate,
                    endDate: finalEndDate
                }
            });
            
            await tx.discountTier.deleteMany({
                where: { discountId: discountId }
            });
            
            await tx.discountTier.createMany({
                data: tiers.map(tier => ({
                    minTickets: tier.minTickets,
                    maxTickets: tier.maxTickets,
                    percentage: tier.percentage,
                    discountId: discountId,
                }))
            });
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
