'use server';

import prisma from '@/lib/prisma';
import { User } from '@/lib/types';

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
    try {
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        if (!email || !password) {
            return 'Please provide all fields.';
        }

        const user = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (!user) {
            return 'Invalid email or password.';
        }

        // IMPORTANT: In a real application, you should hash passwords and compare the hash.
        // For this project, we are comparing plain text passwords as stored in the seed data.
        const passwordsMatch = user.password === password;

        if (!passwordsMatch) {
            return 'Invalid email or password.';
        }
        
        // This is a simplified "token" creation for demonstration purposes.
        // In a real app, use a library like 'jsonwebtoken' and manage sessions securely.
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({ sub: user.id, name: user.name, role: user.role, ownerId: user.busOwnerId, iat: Date.now() }));
        const signature = 'mock-signature'; // In a real app, this would be a secret-signed signature.
        const token = `${header}.${payload}.${signature}`;

        const userRoleDetails = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            ownerId: user.busOwnerId,
            token: token
        }

        return JSON.stringify(userRoleDetails);

    } catch (error) {
        console.error(error);
        return 'An unexpected error occurred.';
    }
}
