
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function deleteRouteAction(routeId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Optional: Check if the route has any active bookings before deleting
    const bookingCount = await prisma.booking.count({
      where: {
        routeId: routeId,
      },
    });

    if (bookingCount > 0) {
      return {
        success: false,
        message: `This route cannot be deleted because it has ${bookingCount} associated booking(s).`,
      };
    }

    await prisma.route.delete({
      where: {
        id: routeId,
      },
    });

    revalidatePath('/admin/routes');
    return { success: true, message: 'Route has been deleted.' };
  } catch (error) {
    console.error('Error deleting route:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
