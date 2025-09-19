
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const locationSchema = z.object({
  name: z.string().min(1, 'Location name is required.'),
});

// Note: Locations are not a separate table. They are derived from the 'origin' and 'destination' fields in the Route table.
// Therefore, "creating" a location means ensuring it exists in a route, and "deleting" it is not straightforward without affecting routes.
// For this app's logic, we will treat locations as a simple list of strings. Creating a location adds it to a conceptual list,
// but it won't be "in use" until a route uses it. Deleting a location will be blocked if any route uses it.

// This is a simplified approach. A more robust solution might involve a dedicated Location table.

async function getUniqueLocations() {
    const routes = await prisma.route.findMany({
        select: { origin: true, destination: true }
    });
    const locationSet = new Set<string>();
    routes.forEach(route => {
        locationSet.add(route.origin);
        locationSet.add(route.destination);
    });
    return Array.from(locationSet);
}


export async function createLocationAction(formData: FormData) {
    const rawData = {
        name: formData.get('name'),
    };

    const validatedData = locationSchema.safeParse(rawData);

    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
        };
    }
    
    const { name } = validatedData.data;

    // In this simplified model, we don't actually create a DB record for a location.
    // We just check if it already exists as an origin/destination.
    // The UI will manage a conceptual list, and this action mainly serves to validate and redirect.
    // A real implementation would likely `prisma.location.create(...)`.

    const existingLocations = await getUniqueLocations();
    if (existingLocations.some(loc => loc.toLowerCase() === name.toLowerCase())) {
        return { success: false, message: 'This location already exists.' };
    }
    
    // Since we don't have a locations table, we don't save anything here.
    // The location will be "saved" when a route is created with it.
    // We'll revalidate and redirect to show it in the list conceptually.
    
    revalidatePath('/admin/locations');
    redirect('/admin/locations');
}

export async function updateLocationAction(formData: FormData) {
    const oldName = formData.get('oldName') as string;
    const newName = formData.get('newName') as string;

    if (!oldName || !newName || oldName === newName) {
        redirect('/admin/locations');
        return;
    }

    try {
        // Update all routes where the location is an origin
        await prisma.route.updateMany({
            where: { origin: oldName },
            data: { origin: newName },
        });

        // Update all routes where the location is a destination
        await prisma.route.updateMany({
            where: { destination: oldName },
            data: { destination: newName },
        });

    } catch (error) {
        console.error("Error updating location:", error);
        return { success: false, message: 'An unexpected error occurred.' };
    }

    revalidatePath('/admin/locations');
    revalidatePath('/admin/routes');
    redirect('/admin/locations');
}


export async function deleteLocationAction(locationName: string): Promise<{ success: boolean; message: string }> {
  try {
    const isInUse = await prisma.route.count({
        where: {
            OR: [
                { origin: locationName },
                { destination: locationName }
            ]
        }
    });

    if (isInUse > 0) {
      return {
        success: false,
        message: `"${locationName}" is currently used in ${isInUse} route(s) and cannot be deleted.`,
      };
    }

    // Since locations are not in a separate table, there's nothing to delete from the DB.
    // If we passed the check above, it means no routes use this location.
    // Revalidating the path will effectively remove it from the list.
    
    revalidatePath('/admin/locations');
    return { success: true, message: 'Location has been deleted.' };
  } catch (error) {
    console.error('Error deleting location:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
