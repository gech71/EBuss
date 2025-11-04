'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { SeatStatus, SeatType } from '@prisma/client';
import { validateRequest } from '@/lib/server/auth';
import { validateCsrf } from '@/app/lib/actions';
import { logAction } from '@/app/lib/logger';

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

const createBusSchema = busSchema;
const updateBusSchema = busSchema.extend({
    id: z.string().min(1, 'Bus ID is required.'),
});


export async function createBusAction(formData: FormData) {
    await validateCsrf(formData);
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

    const validatedData = createBusSchema.safeParse(rawData);

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
    await validateCsrf(formData);
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        await logAction({ actionType: 'UPDATE_BUS_ATTEMPT_FAIL', description: 'Unauthorized attempt to update bus.' });
        return { success: false, message: 'Unauthorized' };
    }

    const rawData = {
        id: formData.get('id'),
        name: formData.get('name'),
        capacity: Number(formData.get('capacity')),
        rows: Number(formData.get('rows')),
        cols: Number(formData.get('cols')),
        seats: JSON.parse(formData.get('seats') as string),
    };

    const validatedData = updateBusSchema.safeParse(rawData);

    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
        };
    }

    const { id: busId, name, capacity, rows, cols, seats } = validatedData.data;

    try {
       await prisma.$transaction(async (tx) => {
            const bus = await tx.bus.findFirst({
                where: {
                    id: busId,
                    ownerId: user.busOwnerId
                },
                include: {
                    _count: {
                        select: { routes: true }
                    }
                }
            });

            if (!bus) {
                throw new Error("Bus not found or you don't have permission to edit it.");
            }

            if (bus._count.routes > 0) {
                throw new Error("This bus cannot be edited because it is assigned to active routes.");
            }
            
            // Delete old layout and seats
            if (bus.layoutId) {
                await tx.seat.deleteMany({ where: { layoutId: bus.layoutId } });
                await tx.seatLayout.delete({ where: { id: bus.layoutId } });
            }

            // Update bus and create new layout
            await tx.bus.update({
                where: { id: busId },
                data: {
                    name,
                    capacity,
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
        await logAction({ userId: user.id, actionType: 'UPDATE_BUS_FAIL', description: `Failed to update bus ${busId}. Error: ${message}` });
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

    // Since Bus and SeatLayout have a cascaded delete, we only need to delete the bus.
    // The transaction ensures this is an all-or-nothing operation.
    await prisma.$transaction(async (tx) => {
        const busToDelete = await tx.bus.findUnique({ where: { id: busId, ownerId: user.busOwnerId }});
        if (!busToDelete) {
            throw new Error("Bus not found or you don't have permission to delete it.");
        }
        if (busToDelete.layoutId) {
            await tx.seat.deleteMany({ where: { layoutId: busToDelete.layoutId } });
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
