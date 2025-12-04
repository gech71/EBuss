
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { validateRequest } from '@/lib/server/auth';
import { validateCsrf } from '@/app/lib/actions';
import { logAction } from '@/app/lib/logger';

const locationSchema = z.object({
  name: z.string().min(1, 'Location name is required.'),
});

export async function createLocationAction(formData: FormData) {
    try {
        await validateCsrf(formData.get('csrfToken') as string);
    } catch (error) {
        return { success: false, message: 'Your session has expired or is invalid. Please refresh the page and try again.' };
    }

    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        await logAction({ actionType: 'CREATE_LOCATION_ATTEMPT_FAIL', description: 'Unauthorized attempt to create location.' });
        return { success: false, message: 'Unauthorized' };
    }

    const validatedData = locationSchema.safeParse({
        name: formData.get('name'),
    });

    if (!validatedData.success) {
        const errorMessage = validatedData.error.errors.map(e => e.message).join(', ');
        await logAction({ userId: user.id, actionType: 'CREATE_LOCATION_FAIL', description: `Validation failed: ${errorMessage}`, details: { attemptedData: { name: formData.get('name') } } });
        return {
            success: false,
            message: errorMessage
        };
    }
    
    const { name } = validatedData.data;

    try {
        const newLocation = await prisma.location.create({
            data: { 
                name,
                ownerId: user.busOwnerId,
            }
        });
        await logAction({ userId: user.id, actionType: 'CREATE_LOCATION', description: `Created location '${name}' (${newLocation.id}).`, details: { newLocation } });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await logAction({ userId: user.id, actionType: 'CREATE_LOCATION_FAIL', description: `Failed to create location '${name}'. Error: ${message}`, details: { error: message, attemptedData: validatedData.data } });
        return { success: false, message: 'A location with this name already exists for your account.' };
    }
    
    revalidatePath('/admin/locations');
    redirect('/admin/locations');
}

export async function updateLocationAction(prevState: any, formData: FormData) {
    try {
        await validateCsrf(formData.get('csrfToken') as string);
    } catch (error) {
        return { success: false, message: 'Your session has expired or is invalid. Please refresh the page and try again.' };
    }

    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        await logAction({ actionType: 'UPDATE_LOCATION_ATTEMPT_FAIL', description: 'Unauthorized attempt to update location.' });
        return { success: false, message: 'Unauthorized' };
    }

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;

    if (!id || !name) {
        await logAction({ userId: user.id, actionType: 'UPDATE_LOCATION_FAIL', description: 'Invalid data provided.' });
        return { success: false, message: 'Invalid data provided.'};
    }

    try {
        const oldLocation = await prisma.location.findFirst({
            where: { id, ownerId: user.busOwnerId }
        });

        if (!oldLocation) {
            throw new Error("Location not found or you don't have permission to edit it.");
        }

        const updatedLocation = await prisma.location.update({
            where: { id },
            data: { name },
        });
        await logAction({ userId: user.id, actionType: 'UPDATE_LOCATION', description: `Updated location ${id} to name '${name}'.`, details: { oldValue: oldLocation, newValue: updatedLocation } });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await logAction({ userId: user.id, actionType: 'UPDATE_LOCATION_FAIL', description: `Failed to update location ${id} to '${name}'. Error: ${message}`, details: { error: message, attemptedData: { id, name } } });
        return { success: false, message: 'A location with this name already exists or another error occurred.' };
    }

    revalidatePath('/admin/locations');
    revalidatePath('/admin/routes');
    return { success: true, message: 'Location updated successfully.' };
}


export async function deleteLocationAction(locationId: string, csrfToken: string): Promise<{ success: boolean; message: string }> {
  try {
    await validateCsrf(csrfToken);
  } catch (error) {
    return { success: false, message: 'Your session has expired or is invalid. Please refresh the page and try again.' };
  }
  
  const { user } = await validateRequest();
  if (!user || !user.busOwnerId) {
      await logAction({ actionType: 'DELETE_LOCATION_ATTEMPT_FAIL', description: `Unauthorized attempt to delete location ${locationId}.` });
      return { success: false, message: 'Unauthorized' };
  }
  
  try {
    const locationToDelete = await prisma.location.findFirst({
        where: { id: locationId, ownerId: user.busOwnerId }
    });

    if (!locationToDelete) {
        await logAction({ userId: user.id, actionType: 'DELETE_LOCATION_FAIL', description: `Location not found or permission denied for ID: ${locationId}` });
        return { success: false, message: 'Location not found or you do not have permission to delete it.' };
    }

    const originInUse = await prisma.route.count({ where: { originId: locationId } });
    const destinationInUse = await prisma.route.count({ where: { destinationId: locationId } });
    const totalUsage = originInUse + destinationInUse;

    if (totalUsage > 0) {
       await logAction({ userId: user.id, actionType: 'DELETE_LOCATION_FAIL', description: `Failed to delete location ${locationId} (in use by ${totalUsage} routes).` });
      return {
        success: false,
        message: `This location is used in ${totalUsage} route(s) and cannot be deleted.`,
      };
    }

    await prisma.location.delete({ 
        where: { id: locationId } 
    });
    
    await logAction({ userId: user.id, actionType: 'DELETE_LOCATION', description: `Deleted location ${locationId}.`, details: { deletedLocation: locationToDelete } });
    revalidatePath('/admin/locations');
    return { success: true, message: 'Location has been deleted.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await logAction({ userId: user.id, actionType: 'DELETE_LOCATION_FAIL', description: `Error deleting location ${locationId}. Error: ${message}`, details: { error: message } });
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
