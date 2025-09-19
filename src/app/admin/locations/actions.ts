
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const locationSchema = z.object({
  name: z.string().min(1, 'Location name is required.'),
});

export async function createLocationAction(formData: FormData) {
    const validatedData = locationSchema.safeParse({
        name: formData.get('name'),
    });

    if (!validatedData.success) {
        // Handle validation errors, maybe return them to the form
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
        };
    }
    
    const { name } = validatedData.data;

    try {
        await prisma.location.create({
            data: { name }
        });
    } catch (error) {
        return { success: false, message: 'A location with this name already exists.' };
    }
    
    revalidatePath('/admin/locations');
    redirect('/admin/locations');
}

export async function updateLocationAction(formData: FormData) {
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;

    if (!id || !name) {
        redirect('/admin/locations');
        return;
    }

    try {
        await prisma.location.update({
            where: { id },
            data: { name },
        });

    } catch (error) {
        console.error("Error updating location:", error);
        return { success: false, message: 'A location with this name already exists or another error occurred.' };
    }

    revalidatePath('/admin/locations');
    revalidatePath('/admin/routes');
    redirect('/admin/locations');
}


export async function deleteLocationAction(locationId: string): Promise<{ success: boolean; message: string }> {
  try {
    const originInUse = await prisma.route.count({ where: { originId: locationId } });
    const destinationInUse = await prisma.route.count({ where: { destinationId: locationId } });

    const totalUsage = originInUse + destinationInUse;

    if (totalUsage > 0) {
      return {
        success: false,
        message: `This location is used in ${totalUsage} route(s) and cannot be deleted.`,
      };
    }

    await prisma.location.delete({ where: { id: locationId } });
    
    revalidatePath('/admin/locations');
    return { success: true, message: 'Location has been deleted.' };
  } catch (error) {
    console.error('Error deleting location:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
