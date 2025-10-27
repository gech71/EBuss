
'use server';

import prisma from '@/lib/prisma';
import { validateRequest } from '@/lib/server/auth';
import { getIP } from './get-ip';
import type { Role } from '@prisma/client';

interface LogActionParams {
    userId?: string;
    actionType: string;
    description: string;
    ipAddress?: string | null;
}

export async function logAction(params: LogActionParams) {
    try {
        let finalUserId = params.userId;
        let userName: string | undefined;
        let userRole: Role | undefined;
        let finalIpAddress = params.ipAddress;

        if (finalUserId) {
            const user = await prisma.user.findUnique({
                where: { id: finalUserId },
            });
            if (user) {
                userName = user.name;
                userRole = user.role;
            }
        } else {
             // If no userId is provided, try to get it from the current session
            const { user: sessionUser } = await validateRequest();
            if (sessionUser) {
                finalUserId = sessionUser.id;
                userName = sessionUser.name;
                userRole = sessionUser.role;
            }
        }
        
        if (!finalIpAddress) {
            finalIpAddress = await getIP();
        }
        
        await prisma.auditLog.create({
            data: {
                userId: finalUserId,
                userName,
                userRole,
                ipAddress: finalIpAddress,
                actionType: params.actionType,
                description: params.description,
            },
        });
    } catch (error) {
        // Log to console if database logging fails, to not lose the audit trail completely.
        console.error('Failed to write to audit log:', { params, error });
    }
}
