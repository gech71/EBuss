'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function deleteOwnerAction(ownerId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Check if the owner has any buses associated with them
    const busCount = await prisma.bus.count({
      where: {
        ownerId: ownerId,
      },
    });

    if (busCount > 0) {
      return {
        success: false,
        message: `This owner cannot be deleted because they have ${busCount} bus(es) assigned to them.`,
      };
    }
    
    // Check if any users are assigned to this owner
    const userCount = await prisma.user.count({
        where: {
            busOwnerId: ownerId
        }
    });

    if (userCount > 0) {
       return {
        success: false,
        message: `This owner cannot be deleted because they have ${userCount} user(s) assigned to them.`,
      };
    }


    await prisma.busOwner.delete({
      where: {
        id: ownerId,
      },
    });

    revalidatePath('/super-admin/owners');
    return { success: true, message: 'Owner has been deleted.' };
  } catch (error) {
    console.error('Error deleting owner:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
