
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { SeatStatus, SeatType } from '@prisma/client';
import { validateRequest } from '@/app/lib/auth';
import { validateCsrf } from '@/app/lib/actions';

const seatSchema = z.object({
  seatNumber: z.string(),
  status: z.nativeEnum(SeatStatus),
  type: z.nativeEnum(SeatType),
});

const createBusSchema = z.object({
  name: z.string().min(1, 'Bus name is required.'),
  capacity: z.number().int().positive('Capacity must be a positive integer.'),
  rows: z.number().int().positive(),
  cols: z.number().int().positive(),
  seats: z.array(seatSchema),
});

export async function createBusAction(formData: FormData) {
    await validateCsrf(formData);
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        return { success: false, message: 'Unauthorized' };
    }

    const rawData = {
        name: formData.get('name'),
        capacity: Number(formData.get('capacity')),
        rows: Number(formData.get('rows')),
        cols: Number(formData.get('cols')),
        seats: JSON.parse(formData.get('seats') as string),
    };

    const validatedData = createBusSchema.safeParse(rawData);

    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
        };
    }

    const { name, capacity, rows, cols, seats } = validatedData.data;

    try {
        await prisma.bus.create({
            data: {
                name,
                capacity,
                owner: {
                    connect: {
                        id: user.busOwnerId
                    }
                },
                layout: {
                    create: {
                        rows,
                        cols,
                        seats: {
                            create: seats,
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error creating bus:", error);
        return { success: false, message: 'An unexpected error occurred.' };
    }

    revalidatePath('/admin/buses');
    redirect('/admin/buses');
}

export async function deleteBusAction(formData: FormData): Promise<{ success: boolean; message: string }> {
  await validateCsrf(formData);
  const busId = formData.get('busId') as string;
  
  const { user } = await validateRequest();
  if (!user || !user.busOwnerId) {
    return { success: false, message: 'Unauthorized' };
  }
  
  try {
    const routeCount = await prisma.route.count({ where: { busId: busId } });

    if (routeCount > 0) {
      return {
        success: false,
        message: `This bus is used in ${routeCount} route(s) and cannot be deleted.`,
      };
    }

    await prisma.bus.delete({
      where: {
        id: busId,
        ownerId: user.busOwnerId,
      },
    });

    revalidatePath('/admin/buses');
    return { success: true, message: 'Bus has been deleted.' };
  } catch (error) {
    console.error('Error deleting bus:', error);
    return { success: false, message: 'An unexpected error occurred or you do not have permission.' };
  }
}
