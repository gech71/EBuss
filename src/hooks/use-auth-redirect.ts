
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

        const isCustomer = !loggedInUserId;
        const isAdmin = loggedInUserId && !isCustomer && !isSuperAdmin;

        let shouldRedirect = false;

        if (!loggedInUserId) {
            // If any role is required and user is not logged in, redirect.
            if (requiredRole) {
                router.replace(loginPath);
                shouldRedirect = true;
            }
        } else {
            // A specific role is required
            if (requiredRole === 'admin') {
                if (isSuperAdmin) {
                    router.replace('/super-admin'); // Super admin should not see admin page
                    shouldRedirect = true;
                } else if (!isAdmin) {
                    router.replace('/unauthorized'); // Not an admin, redirect
                    shouldRedirect = true;
                }
            }

            if (requiredRole === 'super-admin' && !isSuperAdmin) {
                router.replace('/unauthorized'); // Non-super-admin trying to access super-admin page
                shouldRedirect = true;
            }
        }

        if (!shouldRedirect) {
            setLoading(false);
        }
        // If a redirect is happening, we don't need to setLoading(false)
        // because the component will unmount and a new one will load.
        // However, in some fast-refresh scenarios or edge cases, not setting it can cause a flicker.
        // The most robust solution is to let it remain loading until unmount.

    }, [loggedInUserId, isSuperAdmin, requiredRole, router, dataLoading, loginPath]);

    return { loading: loading || dataLoading };
}
