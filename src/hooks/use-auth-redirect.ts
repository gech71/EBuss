
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
        
        // Scenario 1: User is not logged in but should be
        if (!loggedInUserId && requiredRole) {
            router.replace(loginPath);
            // After triggering the redirect, we stop further execution for this render.
            // The loading state will be handled below.
        } 
        // Scenario 2: User is logged in, check roles
        else if (loggedInUserId) {
            if (requiredRole === 'admin') {
                if (isSuperAdmin) {
                    // Super admin trying to access admin page
                    router.replace('/super-admin'); 
                } else if (!isAdmin) {
                    // Non-admin trying to access admin page
                    router.replace('/unauthorized');
                }
            } else if (requiredRole === 'super-admin' && !isSuperAdmin) {
                // Non-super-admin trying to access super-admin page
                router.replace('/unauthorized');
            }
        }

        // Always set loading to false after the checks and potential redirects have been handled.
        // This prevents the infinite loading state.
        setLoading(false);

    }, [loggedInUserId, isSuperAdmin, requiredRole, router, dataLoading, loginPath]);

    // The hook's loading state is true if either the initial data is loading or the redirect logic is running.
    return { loading: dataLoading || loading };
}
