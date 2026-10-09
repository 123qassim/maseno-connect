"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentUser, signOut as signOutUser } from "./auth";
import { supabase } from "./supabase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    void getCurrentUser().then((currentUser) => {
      if (mounted) {
        setUser(currentUser);
        setLoading(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await signOutUser();
    setUser(null);
  }

  return createElement(AuthContext.Provider, { value: { user, loading, signOut } }, children);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
}
