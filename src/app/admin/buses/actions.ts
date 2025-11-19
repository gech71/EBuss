
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { SeatStatus, SeatType } from '@prisma/client';
import { validateRequest } from '@/lib/server/auth';
import { logAction } from '@/app/lib/logger';
import { cookies } from 'next/headers';

async function validateCsrf(tokenFromRequest: string | FormData) {
    const cookieStore = cookies();
    const tokenFromCookie = cookieStore.get('csrf_token')?.value;

    let token: string | null;

    if (tokenFromRequest instanceof FormData) {
        token = tokenFromRequest.get('csrfToken') as string | null;
    } else {
        token = tokenFromRequest;
    }

    if (!token || !tokenFromCookie || token !== tokenFromCookie) {
        await logAction({ actionType: 'CSRF_VALIDATION_FAIL', description: 'Invalid CSRF token received.' });
        throw new Error('Invalid CSRF token.');
    }
}


const seatSchema = z.object({
  seatNumber: z.string(),
  status: z.nativeEnum(SeatStatus),
  type: z.nativeEnum(SeatType),
});

const busSchema = z.object({
  name: z.string().min(1, 'Bus name is required.'),
  capacity: z.number().int().positive('Capacity must be a positive integer.'),
  rows: z.number().int().positive(),
  cols: z.number().int().positive(),
  seats: z.array(seatSchema),
});

export async function createBusAction(formData: FormData) {
    await validateCsrf(formData.get('csrfToken') as string);
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        await logAction({ actionType: 'CREATE_BUS_ATTEMPT_FAIL', description: 'Unauthorized attempt to create bus.' });
        return { success: false, message: 'Unauthorized' };
    }

    const rawData = {
        name: formData.get('name'),
        capacity: Number(formData.get('capacity')),
        rows: Number(formData.get('rows')),
        cols: Number(formData.get('cols')),
        seats: JSON.parse(formData.get('seats') as string),
    };

    const validatedData = busSchema.safeParse(rawData);

    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
        };
    }

    const { name, capacity, rows, cols, seats } = validatedData.data;

    try {
        const newBus = await prisma.bus.create({
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
        await logAction({ userId: user.id, actionType: 'CREATE_BUS', description: `Created bus '${name}' (${newBus.id}).` });
    } catch (error) {
        await logAction({ userId: user.id, actionType: 'CREATE_BUS_FAIL', description: `Failed to create bus '${name}'. Error: ${error instanceof Error ? error.message : 'Unknown'}` });
        return { success: false, message: 'An unexpected error occurred.' };
    }

    revalidatePath('/admin/buses');
    redirect('/admin/buses');
}

export async function updateBusAction(formData: FormData) {
    await validateCsrf(formData.get('csrfToken') as string);
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        await logAction({ actionType: 'UPDATE_BUS_ATTEMPT_FAIL', description: 'Unauthorized attempt to update bus.' });
        return { success: false, message: 'Unauthorized' };
    }

    const busId = formData.get('busId') as string;
    if (!busId) {
        return { success: false, message: 'Bus ID is missing.' };
    }
    
    const rawData = {
        name: formData.get('name'),
        capacity: Number(formData.get('capacity')),
        rows: Number(formData.get('rows')),
        cols: Number(formData.get('cols')),
        seats: JSON.parse(formData.get('seats') as string),
    };

    const validatedData = busSchema.safeParse(rawData);

    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        };
    }
    
    const { name, capacity, rows, cols, seats } = validatedData.data;
    
    // Perform check before starting transaction
    const routeCount = await prisma.route.count({ where: { busId: busId } });
    if (routeCount > 0) {
        return { success: false, message: "This bus cannot be edited because it is assigned to active routes."};
    }

    try {
        await prisma.$transaction(async (tx) => {
            const busToUpdate = await tx.bus.findFirst({
                where: { id: busId, ownerId: user.busOwnerId },
                include: { layout: true }
            });

            if (!busToUpdate) {
                throw new Error("Bus not found or you don't have permission to edit it.");
            }

            // Step 1: Update bus details
            await tx.bus.update({
                where: { id: busId },
                data: { name, capacity }
            });

            // Step 2: Delete old layout and seats if it exists
            if (busToUpdate.layout) {
                await tx.seat.deleteMany({ where: { layoutId: busToUpdate.layout.id }});
                await tx.seatLayout.delete({ where: { id: busToUpdate.layout.id }});
            }

            // Step 3: Use a bus update operation to create the new layout.
            // This maintains the bus as the root of the transaction, which Prisma handles more reliably.
            await tx.bus.update({
                where: { id: busId },
                data: {
                    layout: {
                        create: {
                            rows,
                            cols,
                            seats: {
                                create: seats
                            }
                        }
                    }
                }
            });
        });
        
        await logAction({ userId: user.id, actionType: 'UPDATE_BUS', description: `Updated bus '${name}' (${busId}).` });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        await logAction({ userId: user.id, actionType: 'UPDATE_BUS_FAIL', description: `Failed to update bus '${name}'. Error: ${message}` });
        console.error("Error updating bus:", error);
        return { success: false, message };
    }

    revalidatePath('/admin/buses');
    revalidatePath(`/admin/buses/${busId}/edit`);
    redirect('/admin/buses');
}


export async function deleteBusAction(busId: string, csrfToken: string): Promise<{ success: boolean; message: string }> {
  await validateCsrf(csrfToken);
  
  const { user } = await validateRequest();
  if (!user || !user.busOwnerId) {
    await logAction({ actionType: 'DELETE_BUS_ATTEMPT_FAIL', description: `Unauthorized attempt to delete bus ${busId}.` });
    return { success: false, message: 'Unauthorized' };
  }
  
  try {
    const routeCount = await prisma.route.count({ where: { busId: busId } });

    if (routeCount > 0) {
       await logAction({ userId: user.id, actionType: 'DELETE_BUS_FAIL', description: `Failed to delete bus ${busId} (in use by ${routeCount} routes).` });
      return {
        success: false,
        message: `This bus is used in ${routeCount} route(s) and cannot be deleted.`,
      };
    }

    const busToDelete = await prisma.bus.findFirst({
      where: { id: busId, ownerId: user.busOwnerId },
      include: { layout: true },
    });

    if (!busToDelete) {
      return { success: false, message: "Bus not found or you don't have permission to delete it." };
    }
    
    // Explicitly delete related records in a transaction
    await prisma.$transaction(async (tx) => {
        if (busToDelete.layout) {
            await tx.seat.deleteMany({ where: { layoutId: busToDelete.layout.id } });
            await tx.seatLayout.delete({ where: { id: busToDelete.layout.id } });
        }
        await tx.bus.delete({
            where: {
                id: busId,
            },
        });
    });


    await logAction({ userId: user.id, actionType: 'DELETE_BUS', description: `Deleted bus ${busId}.` });
    revalidatePath('/admin/buses');
    return { success: true, message: 'Bus has been deleted.' };
  } catch (error) {
    await logAction({ userId: user.id, actionType: 'DELETE_BUS_FAIL', description: `Error deleting bus ${busId}. Error: ${error instanceof Error ? error.message : 'Unknown'}` });
    return { success: false, message: 'An unexpected error occurred or you do not have permission.' };
  }
}
