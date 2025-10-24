
"use client";

import { useState, useEffect } from "react";
import { useToast } from "./use-toast";

export function useCsrf() {
  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchCsrfToken() {
      try {
        const response = await fetch('/api/csrf', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error('Failed to fetch CSRF token');
        }
        const { token } = await response.json();
        setCsrfToken(token);
      } catch (error) {
        console.error("Failed to fetch CSRF token", error);
        toast({
            title: "Session Error",
            description: "Could not initialize a secure session. Please refresh the page.",
            variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
    fetchCsrfToken();
  }, [toast]);

  return { csrfToken, loading };
}
