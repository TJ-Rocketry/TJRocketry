"use client";

import { useState, useEffect } from "react";

export type User = {
  id: number;
  ionId: string;
  name: string | null;
  username: string | null;
  classYear: string | null;
  roles: string[];
  pfpUrl: string | null;
};

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setAuthenticated(data.authenticated);
          setUser(data.user || null);
        } else {
          setAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        setAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  return { loading, authenticated, user };
}
