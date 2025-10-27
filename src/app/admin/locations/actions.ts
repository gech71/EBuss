
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
    await validateCsrf(formData.get('csrfToken') as string);
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        await logAction({ actionType: 'CREATE_LOCATION_ATTEMPT_FAIL', description: 'Unauthorized attempt to create location.' });
        return { success: false, message: 'Unauthorized' };
    }

    const validatedData = locationSchema.safeParse({
        name: formData.get('name'),
    });

    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
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
        await logAction({ userId: user.id, actionType: 'CREATE_LOCATION', description: `Created location '${name}' (${newLocation.id}).` });
    } catch (error) {
        await logAction({ userId: user.id, actionType: 'CREATE_LOCATION_FAIL', description: `Failed to create location '${name}'. Error: ${error instanceof Error ? error.message : 'Already exists'}` });
        return { success: false, message: 'A location with this name already exists for your account.' };
    }
    
    revalidatePath('/admin/locations');
    redirect('/admin/locations');
}

export async function updateLocationAction(prevState: any, formData: FormData) {
    await validateCsrf(formData.get('csrfToken') as string);
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        await logAction({ actionType: 'UPDATE_LOCATION_ATTEMPT_FAIL', description: 'Unauthorized attempt to update location.' });
        return { success: false, message: 'Unauthorized' };
    }

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;

    if (!id || !name) {
        return { success: false, message: 'Invalid data provided.'};
    }

    try {
        await prisma.location.update({
            where: { 
                id,
                ownerId: user.busOwnerId,
            },
            data: { name },
        });
        await logAction({ userId: user.id, actionType: 'UPDATE_LOCATION', description: `Updated location ${id} to name '${name}'.` });
    } catch (error) {
        await logAction({ userId: user.id, actionType: 'UPDATE_LOCATION_FAIL', description: `Failed to update location ${id} to '${name}'. Error: ${error instanceof Error ? error.message : 'Unknown'}` });
        return { success: false, message: 'A location with this name already exists or another error occurred.' };
    }

    revalidatePath('/admin/locations');
    revalidatePath('/admin/routes');
    // Don't redirect here, let the client-side handle it on success
    return { success: true, message: 'Location updated successfully.' };
}


export async function deleteLocationAction(locationId: string, csrfToken: string): Promise<{ success: boolean; message: string }> {
  await validateCsrf(csrfToken);
  
  const { user } = await validateRequest();
  if (!user || !user.busOwnerId) {
      await logAction({ actionType: 'DELETE_LOCATION_ATTEMPT_FAIL', description: `Unauthorized attempt to delete location ${locationId}.` });
      return { success: false, message: 'Unauthorized' };
  }
  
  try {
    const location = await prisma.location.findFirst({
        where: { id: locationId, ownerId: user.busOwnerId }
    });

    if (!location) {
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
        where: { 
            id: locationId,
            ownerId: user.busOwnerId
        } 
    });
    
    await logAction({ userId: user.id, actionType: 'DELETE_LOCATION', description: `Deleted location ${locationId}.` });
    revalidatePath('/admin/locations');
    return { success: true, message: 'Location has been deleted.' };
  } catch (error) {
    await logAction({ userId: user.id, actionType: 'DELETE_LOCATION_FAIL', description: `Error deleting location ${locationId}. Error: ${error instanceof Error ? error.message : 'Unknown'}` });
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
