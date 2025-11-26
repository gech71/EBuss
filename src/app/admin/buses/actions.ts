
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { SeatStatus, SeatType } from '@prisma/client';
import { validateRequest } from '@/lib/server/auth';
import { logAction } from '@/app/lib/logger';
import { cookies } from 'next/headers';
import { validateCsrf } from '@/app/lib/actions';


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
        const errorMessage = validatedData.error.errors.map(e => e.message).join(', ');
        await logAction({ userId: user.id, actionType: 'CREATE_BUS_FAIL', description: `Validation failed: ${errorMessage}`, details: { attemptedData: rawData } });
        return {
            success: false,
            message: errorMessage
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
            },
            include: {
                layout: {
                    include: {
                        seats: true
                    }
                }
            }
        });
        await logAction({ userId: user.id, actionType: 'CREATE_BUS', description: `Created bus '${name}' (${newBus.id}).`, details: { newBus } });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await logAction({ userId: user.id, actionType: 'CREATE_BUS_FAIL', description: `Failed to create bus '${name}'. Error: ${message}`, details: { error: message, attemptedData: validatedData.data } });
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
        const errorMessage = validatedData.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        await logAction({ userId: user.id, actionType: 'UPDATE_BUS_FAIL', description: `Validation failed for bus ${busId}: ${errorMessage}`, details: { attemptedData: rawData } });
        return {
            success: false,
            message: errorMessage
        };
    }
    
    const { name, capacity, rows, cols, seats } = validatedData.data;
    
    const routeCount = await prisma.route.count({ where: { busId: busId } });
    if (routeCount > 0) {
        await logAction({ userId: user.id, actionType: 'UPDATE_BUS_FAIL', description: `Attempted to edit bus ${busId} which is in use.`, details: { attemptedData: validatedData.data } });
        return { success: false, message: "This bus cannot be edited because it is assigned to active routes."};
    }

    try {
        const oldBus = await prisma.bus.findFirst({
            where: { id: busId, ownerId: user.busOwnerId },
            include: { layout: { include: { seats: true } } }
        });

        if (!oldBus) {
            throw new Error("Bus not found or you don't have permission to edit it.");
        }
        
        let updatedBus;

        await prisma.$transaction(async (tx) => {
            if (oldBus.layout) {
                await tx.seat.deleteMany({ where: { layoutId: oldBus.layout.id }});
                await tx.seatLayout.update({
                    where: { id: oldBus.layout.id },
                    data: {
                        rows,
                        cols,
                        seats: {
                            create: seats
                        }
                    }
                });
            } else {
                // This case is unlikely with the current UI but good for robustness
                 await tx.seatLayout.create({
                    data: {
                        busId: busId,
                        rows,
                        cols,
                        seats: {
                            create: seats
                        }
                    }
                 })
            }
            
            updatedBus = await tx.bus.update({
                where: { id: busId },
                data: { name, capacity },
                 include: {
                    layout: {
                        include: {
                            seats: true
                        }
                    }
                }
            });
        });
        
        await logAction({ userId: user.id, actionType: 'UPDATE_BUS', description: `Updated bus '${name}' (${busId}).`, details: { oldValue: oldBus, newValue: updatedBus } });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        await logAction({ userId: user.id, actionType: 'UPDATE_BUS_FAIL', description: `Failed to update bus '${name}'. Error: ${message}`, details: { error: message, attemptedData: validatedData.data } });
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
      include: {
          layout: {
              include: {
                  seats: true
              }
          }
      }
    });

    if (!busToDelete) {
      await logAction({ userId: user.id, actionType: 'DELETE_BUS_FAIL', description: `Bus not found or permission denied for ID: ${busId}` });
      return { success: false, message: "Bus not found or you don't have permission to delete it." };
    }
    
    // Deleting the bus will cascade and delete the layout and seats
    await prisma.bus.delete({
        where: { id: busId }
    });


    await logAction({ userId: user.id, actionType: 'DELETE_BUS', description: `Deleted bus '${busToDelete.name}' (${busId}).`, details: { deletedBus: busToDelete } });
    revalidatePath('/admin/buses');
    return { success: true, message: 'Bus has been deleted.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await logAction({ userId: user.id, actionType: 'DELETE_BUS_FAIL', description: `Error deleting bus ${busId}. Error: ${message}`, details: { error: message } });
    return { success: false, message: 'An unexpected error occurred or you do not have permission.' };
  }
}
