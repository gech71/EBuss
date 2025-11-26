
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { validateRequest } from '@/lib/server/auth';
import { logAction } from '@/app/lib/logger';
import { validateCsrf } from '@/app/lib/actions';

const busRouteSchema = z.object({
  busId: z.string().min(1, 'A bus must be selected.'),
  originId: z.string().min(1, 'An origin must be selected.'),
  destinationId: z.string().min(1, 'A destination must be selected.'),
});

export async function createBusRouteAction(formData: FormData) {
    await validateCsrf(formData);

    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        await logAction({ actionType: 'CREATE_BUS_MAPPING_FAIL', description: 'Unauthorized attempt to create bus mapping.' });
        return { success: false, message: 'Unauthorized' };
    }

    const rawData = {
        busId: formData.get('busId'),
        originId: formData.get('originId'),
        destinationId: formData.get('destinationId'),
    };

    const validatedData = busRouteSchema.safeParse(rawData);

    if (!validatedData.success) {
        const errorMessage = validatedData.error.errors.map(e => e.message).join(', ');
        await logAction({ userId: user.id, actionType: 'CREATE_BUS_MAPPING_FAIL', description: `Validation failed: ${errorMessage}`, details: { attemptedData: rawData } });
        return {
            success: false,
            message: errorMessage
        };
    }
    
    const { busId, originId, destinationId } = validatedData.data;

    if (originId === destinationId) {
        await logAction({ userId: user.id, actionType: 'CREATE_BUS_MAPPING_FAIL', description: 'Origin and destination were the same.', details: { attemptedData: validatedData.data } });
        return { success: false, message: 'Origin and destination cannot be the same.' };
    }

    try {
        const existingMapping = await prisma.busRoute.findFirst({
            where: { busId: busId }
        });

        if (existingMapping) {
            await logAction({ userId: user.id, actionType: 'CREATE_BUS_MAPPING_FAIL', description: 'Bus already mapped.', details: { attemptedData: validatedData.data, existingMapping } });
            return { success: false, message: 'This bus is already mapped to a route. A bus can only be mapped to one route at a time.' };
        }

        const newMapping = await prisma.busRoute.create({
            data: {
                busId,
                originId,
                destinationId,
            }
        });
        await logAction({ userId: user.id, actionType: 'CREATE_BUS_MAPPING', description: `Created bus mapping ${newMapping.id} for bus ${busId}.`, details: { newMapping } });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        if (message.includes('Unique constraint failed')) {
            await logAction({ userId: user.id, actionType: 'CREATE_BUS_MAPPING_FAIL', description: `Unique constraint failed.`, details: { attemptedData: validatedData.data } });
            return { success: false, message: 'This bus mapping already exists.' };
        }
        await logAction({ userId: user.id, actionType: 'CREATE_BUS_MAPPING_FAIL', description: `Failed to create bus mapping. Error: ${message}`, details: { error: message, attemptedData: validatedData.data } });
        return { success: false, message: 'An unexpected error occurred.' };
    }
    
    revalidatePath('/admin/bus-mappings');
    return { success: true, message: 'Bus mapping created successfully.' };
}

export async function deleteBusRouteAction(id: string, csrfToken: string): Promise<{ success: boolean; message: string }> {
  await validateCsrf(csrfToken);
  
  const { user } = await validateRequest();
  if (!user || !user.busOwnerId) {
      await logAction({ actionType: 'DELETE_BUS_MAPPING_FAIL', description: `Unauthorized attempt to delete bus mapping ${id}.` });
      return { success: false, message: 'Unauthorized' };
  }
  
  try {
    const mappingToDelete = await prisma.busRoute.findFirst({
        where: { 
            id: id,
            bus: {
                ownerId: user.busOwnerId
            }
        }
    });

    if (!mappingToDelete) {
        await logAction({ userId: user.id, actionType: 'DELETE_BUS_MAPPING_FAIL', description: `Mapping not found or permission denied for ID: ${id}` });
        return { success: false, message: 'Mapping not found or you do not have permission to delete it.' };
    }

    await prisma.busRoute.delete({ 
        where: { id: id } 
    });
    
    await logAction({ userId: user.id, actionType: 'DELETE_BUS_MAPPING', description: `Deleted bus mapping ${id}.`, details: { deletedMapping: mappingToDelete } });
    revalidatePath('/admin/bus-mappings');
    return { success: true, message: 'Bus mapping has been deleted.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await logAction({ userId: user.id, actionType: 'DELETE_BUS_MAPPING_FAIL', description: `Error deleting bus mapping ${id}. Error: ${message}`, details: { error: message } });
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
