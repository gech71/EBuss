
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { validateRequest } from '@/app/lib/auth';
import { validateCsrf } from '@/app/lib/actions';

const tierSchema = z.object({
  id: z.string().optional(),
  minTickets: z.coerce.number().int().positive(),
  maxTickets: z.coerce.number().int().positive(),
  percentage: z.coerce.number().positive(),
});

const discountSchema = z.object({
  name: z.string().min(1, "Discount name is required."),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  tiers: z.array(tierSchema).min(1, "At least one discount tier is required."),
});

export async function createDiscountAction(formData: FormData) {
    await validateCsrf(formData.get('csrfToken') as string);
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
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

    try {
        await prisma.discount.create({
            data: {
                name,
                startDate,
                endDate,
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
    } catch (error) {
        console.error("Error creating discount:", error);
        return { success: false, message: 'An unexpected error occurred.' };
    }
    
    revalidatePath('/admin/discounts');
    redirect('/admin/discounts');
}

export async function updateDiscountAction(formData: FormData) {
    await validateCsrf(formData.get('csrfToken') as string);
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
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
                data: { name, startDate, endDate }
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
    } catch (error) {
         const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
         console.error("Error updating discount:", error);
        return { success: false, message };
    }

    revalidatePath('/admin/discounts');
    redirect('/admin/discounts');
}

export async function deleteDiscountAction(discountId: string, csrfToken: string): Promise<{ success: boolean; message: string }> {
    await validateCsrf(csrfToken);

    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
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

        revalidatePath('/admin/discounts');
        return { success: true, message: 'Discount has been deleted.' };
    } catch (error) {
        console.error('Error deleting discount:', error);
        return { success: false, message: 'An unexpected error occurred.' };
    }
}
