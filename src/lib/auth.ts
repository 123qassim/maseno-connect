import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
