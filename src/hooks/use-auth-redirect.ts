
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/store';

type AuthRedirectOptions = {
    requiredRole?: 'admin' | 'super-admin';
    loginPath?: string;
};

export function useAuthRedirect(options: AuthRedirectOptions = {}) {
    const { requiredRole, loginPath = '/login' } = options;
    const { loggedInUserId, isSuperAdmin, loading: dataLoading } = useData();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (dataLoading) {
            return; // Wait for data to be loaded, including auth state from localStorage
        }

        const isCustomer = loggedInUserId === 'customer' || !loggedInUserId;

        if (isCustomer) {
            router.replace(loginPath);
            return;
        }
        
        const isAdmin = loggedInUserId && !loggedInUserId.startsWith('user-') && !isSuperAdmin;

        if (requiredRole === 'admin' && !isAdmin && !isSuperAdmin) {
            router.replace(loginPath);
            return;
        }


        if (requiredRole === 'super-admin' && !isSuperAdmin) {
             router.replace('/admin'); // Or a dedicated access-denied page
             return;
        }

        setLoading(false);

    }, [loggedInUserId, isSuperAdmin, requiredRole, router, dataLoading, loginPath]);

    return { loading: loading || dataLoading };
}
