
'use server';

import { headers } from 'next/headers';
import { NextRequest } from 'next/server';

export async function getIP(request?: NextRequest) {
    const headersList = headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    const realIp = headersList.get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }
    // For local development or when not behind a proxy
    if (request?.ip) {
      return request.ip;
    }
    
    return null;
}
