
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
        // If the initial data (including auth state from localStorage) is still loading,
        // we keep showing the loading screen.
        if (dataLoading) {
            return;
        }

        const isAdmin = loggedInUserId && !isSuperAdmin;
        let shouldRedirect = false;

        // Scenario 1: User is not logged in
        if (!loggedInUserId) {
            if (requiredRole) {
                router.replace(loginPath);
                shouldRedirect = true;
            }
        } else {
            // Scenario 2: User is logged in, check roles
            if (requiredRole === 'admin' && !isAdmin) {
                // Accessing admin page, but user is not an admin
                router.replace('/unauthorized');
                shouldRedirect = true;
            } else if (requiredRole === 'super-admin' && !isSuperAdmin) {
                // Accessing super-admin page, but user is not a super-admin
                router.replace('/unauthorized');
                shouldRedirect = true;
            }
        }
        
        // If no redirect is needed, we can stop showing the loading screen.
        if (!shouldRedirect) {
            setLoading(false);
        }
        // If a redirect is triggered, the component will unmount, so we don't need to setLoading(false).

    }, [loggedInUserId, isSuperAdmin, requiredRole, router, dataLoading, loginPath]);

    // The loading state of the hook is dependent on the data loading from the store.
    return { loading: dataLoading || loading };
}
