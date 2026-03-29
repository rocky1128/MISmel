import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { hasSupabaseConfig, supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function init() {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(s);
      if (s?.user) await loadProfile(s.user.id, mounted);
      setLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s?.user) await loadProfile(s.user.id, mounted);
      else setProfile(null);
      setLoading(false);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  async function loadProfile(userId, mounted) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, role, department_id")
      .eq("id", userId)
      .single();
    if (mounted) setProfile(data ?? { full_name: "User", email: "", role: "contributor" });
  }

  const value = useMemo(() => ({
    loading,
    session,
    profile,
    isAuthenticated: Boolean(session),
    isConfigured: hasSupabaseConfig,
    async signIn(email, password) {
      if (!supabase) return { success: false, error: { message: "Supabase not configured." } };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error };
      return { success: true };
    },
    async signUp(email, password, fullName) {
      if (!supabase) return { success: false, error: { message: "Supabase not configured." } };
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } }
      });
      if (error) return { success: false, error };
      return { success: true };
    },
    async signOut() {
      if (!supabase) return { success: true };
      const { error } = await supabase.auth.signOut();
      if (error) return { success: false, error };
      setProfile(null);
      return { success: true };
    }
  }), [loading, session, profile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
