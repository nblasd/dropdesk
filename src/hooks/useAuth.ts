"use client";

import { useEffect, useState, type MutableRefObject } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SessionHandler = (sb: SupabaseClient, userId: string) => Promise<boolean>;

type Options = {
  toast: (message: string) => void;
  closeModal: () => void;
  sessionHandlerRef: MutableRefObject<SessionHandler | null>;
};

export function useAuth({ toast, closeModal, sessionHandlerRef }: Options) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userPublicId, setUserPublicId] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    try {
      const u = process.env.NEXT_PUBLIC_SUPABASE_URL,
        k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!u || !k) {
        setAuthReady(true);
        return;
      }
      const sb = createClient(u, k);
      setSupabase(sb);
      (async () => {
        try {
          const {
            data: { session },
          } = await sb.auth.getSession();
          // No stored session: this is a normal signed-out visitor, not an error.
          if (!session) return;
          const { data, error } = await sb.auth.getUser();
          const user = data?.user;
          if (!user || error) {
            const detail = {
              code: (error as { code?: string } | null)?.code,
              name: (error as { name?: string } | null)?.name,
              status: (error as { status?: number } | null)?.status,
              message: (error as { message?: string } | null)?.message,
            };
            // 401/403 means the stored token is dead (expired, or the account was deleted).
            // Drop it so the visitor can sign in instead of being stuck erroring on every load.
            if (detail.status === 401 || detail.status === 403) {
              console.warn("[Dropdesk][auth.restore] stale session cleared", detail);
              try {
                await sb.auth.signOut({ scope: "local" });
              } catch {}
            } else console.warn("[Dropdesk][auth.restore] could not verify session", detail);
            return;
          }
          if (user.email) {
            setUserEmail(user.email);
            const loaded = sessionHandlerRef.current ? await sessionHandlerRef.current(sb, user.id) : false;
            if (loaded) setUserId(user.id);
          }
        } catch (error) {
          console.warn("[Dropdesk][auth.restore] failed", {
            name: (error as { name?: string })?.name,
            message: error instanceof Error ? error.message : String(error),
          });
        } finally {
          setAuthReady(true);
        }
      })();
    } catch {
      setAuthReady(true);
    }
  }, []);

  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.includes("@")) return toast("Enter a valid email address");
    if (authPassword.length < 8) return toast("Use a password with at least 8 characters");
    if (authMode === "signup" && !authName.trim()) return toast("Enter your name");
    if (!supabase) return toast("Connect Supabase to create a secure account");
    setAuthBusy(true);
    try {
      const result =
        authMode === "signup"
          ? await supabase.auth.signUp({
              email: authEmail,
              password: authPassword,
              options: { data: { full_name: authName.trim(), name: authName.trim() }, emailRedirectTo: window.location.origin },
            })
          : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (result.error) {
        console.error("[Dropdesk][auth.submit] failed", {
          mode: authMode,
          message: result.error.message,
          status: result.error.status,
          code: result.error.code,
          email: authEmail,
        });
        return toast(result.error.message);
      }
      const user = result.data.user;
      if (result.data.session && user) {
        setUserEmail(user.email ?? authEmail);
        const loaded = sessionHandlerRef.current ? await sessionHandlerRef.current(supabase, user.id) : false;
        if (loaded) setUserId(user.id);
        closeModal();
        toast(authMode === "signup" ? "Your account is ready" : "You’re signed in");
      } else if (authMode === "signup") {
        closeModal();
        toast("Account created. If email confirmation is enabled, use the link in your inbox.");
      } else toast("Sign-in did not return an active session");
    } finally {
      setAuthBusy(false);
    }
  };

  const continueWithGoogle = async () => {
    if (!supabase) return toast("Connect Supabase to enable Google sign-in");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) toast(error.message);
  };

  const copyPublicId = async () => {
    if (!userPublicId) return toast("Your Dropdesk ID is not available yet");
    try {
      await navigator.clipboard.writeText(userPublicId);
      toast("Your Dropdesk ID was copied");
    } catch {
      toast(`Your Dropdesk ID is ${userPublicId}`);
    }
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUserId(null);
    setUserEmail("");
    setUserPublicId("");
  };

  return {
    supabase,
    userEmail,
    authReady,
    userId,
    setUserId,
    userPublicId,
    setUserPublicId,
    authEmail,
    setAuthEmail,
    authName,
    setAuthName,
    authPassword,
    setAuthPassword,
    authMode,
    setAuthMode,
    authBusy,
    submitAuth,
    continueWithGoogle,
    copyPublicId,
    signOut,
  };
}

export type AuthApi = ReturnType<typeof useAuth>;
