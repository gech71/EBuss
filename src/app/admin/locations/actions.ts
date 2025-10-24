
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { validateRequest } from '@/app/lib/auth';
import { validateCsrf } from '@/app/lib/actions';

const locationSchema = z.object({
  name: z.string().min(1, 'Location name is required.'),
});

export async function createLocationAction(formData: FormData) {
    await validateCsrf(formData);
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
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
        await prisma.location.create({
            data: { 
                name,
                ownerId: user.busOwnerId,
            }
        });
    } catch (error) {
        return { success: false, message: 'A location with this name already exists for your account.' };
    }
    
    revalidatePath('/admin/locations');
    redirect('/admin/locations');
}

export async function updateLocationAction(prevState: any, formData: FormData) {
    await validateCsrf(formData);
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
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

    } catch (error) {
        console.error("Error updating location:", error);
        return { success: false, message: 'A location with this name already exists or another error occurred.' };
    }

    revalidatePath('/admin/locations');
    revalidatePath('/admin/routes');
    // Don't redirect here, let the client-side handle it on success
    return { success: true, message: 'Location updated successfully.' };
}


export async function deleteLocationAction(locationId: string, csrfToken: string): Promise<{ success: boolean; message: string }> {
  const formData = new FormData();
  formData.append('csrfToken', csrfToken);
  await validateCsrf(formData);
  
  const { user } = await validateRequest();
  if (!user || !user.busOwnerId) {
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
    
    revalidatePath('/admin/locations');
    return { success: true, message: 'Location has been deleted.' };
  } catch (error) {
    console.error('Error deleting location:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}

