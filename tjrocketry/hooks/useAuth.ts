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
  bio: string | null;
  position: string | null;
};

type AuthState = { authenticated: boolean; user: User | null };

let pending: Promise<AuthState> | null = null;

function loadAuth(): Promise<AuthState> {
  if (!pending) {
    pending = fetch("/api/auth/me")
      .then(async res => {
        if (!res.ok) return { authenticated: false, user: null };
        const data = await res.json();
        return { authenticated: !!data.authenticated, user: data.user || null };
      })
      .catch(() => {
        pending = null;
        return { authenticated: false, user: null };
      });
  }
  return pending;
}

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AuthState>({ authenticated: false, user: null });

  useEffect(() => {
    let alive = true;
    loadAuth().then(s => {
      if (!alive) return;
      setState(s);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  return { loading, authenticated: state.authenticated, user: state.user };
}

export const isAdminUser = (user: User | null) =>
  !!user && user.roles.some(r => ["admin", "sponsor"].includes(r));

export const isStaffUser = (user: User | null) =>
  !!user && user.roles.some(r => ["admin", "sponsor", "officer"].includes(r));

export const isMemberUser = (user: User | null) =>
  !!user && user.roles.some(r => ["admin", "sponsor", "officer", "ARCmember", "BOTRmember"].includes(r));
