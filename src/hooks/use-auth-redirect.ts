
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
        const isAdmin = loggedInUserId && !isCustomer && !isSuperAdmin;

        if (!requiredRole) {
            // No role required, but user must be logged in
            if (isCustomer) {
                router.replace(loginPath);
                return;
            }
        } else {
             // A specific role is required
            if (isCustomer) {
                router.replace(loginPath);
                return;
            }

            if (requiredRole === 'admin') {
                if (isSuperAdmin) {
                    router.replace('/super-admin'); // Super admin should not see admin page
                    return;
                }
                if (!isAdmin) {
                    router.replace(loginPath); // Not an admin, redirect
                    return;
                }
            }

            if (requiredRole === 'super-admin' && !isSuperAdmin) {
                router.replace('/admin'); // Or a dedicated access-denied page
                return;
            }
        }

        setLoading(false);

    }, [loggedInUserId, isSuperAdmin, requiredRole, router, dataLoading, loginPath]);

    return { loading: loading || dataLoading };
}
