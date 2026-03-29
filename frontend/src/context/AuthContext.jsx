import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { hasSupabaseConfig, supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);
const AUTH_INIT_TIMEOUT_MS = 5000;
const PROFILE_LOAD_TIMEOUT_MS = 4000;

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
      try {
        const {
          data: { session: s }
        } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_INIT_TIMEOUT_MS,
          "Authentication bootstrap timed out."
        );

        if (!mounted) return;
        setSession(s);

        if (s?.user) {
          await loadProfile(s.user.id, mounted);
        } else {
          setProfile(null);
        }
      } catch (error) {
        if (!mounted) return;
        console.warn("[auth] Failed to initialize session, falling back to login.", error);
        setSession(null);
        setProfile(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      try {
        if (!mounted) return;
        setSession(s);
        if (s?.user) await loadProfile(s.user.id, mounted);
        else setProfile(null);
      } catch (error) {
        if (!mounted) return;
        console.warn("[auth] Failed to refresh auth state.", error);
        setProfile(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  async function loadProfile(userId, mounted) {
    try {
      const { data } = await withTimeout(
        supabase
          .from("profiles")
          .select("full_name, email, role, department_id")
          .eq("id", userId)
          .single(),
        PROFILE_LOAD_TIMEOUT_MS,
        "Profile lookup timed out."
      );

      if (mounted) {
        setProfile(data ?? { full_name: "User", email: "", role: "contributor" });
      }
    } catch (error) {
      console.warn("[auth] Failed to load profile, using fallback profile.", error);
      if (mounted) {
        setProfile({ full_name: "User", email: "", role: "contributor" });
      }
    }
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

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(message)), timeoutMs)
    )
  ]);
}
