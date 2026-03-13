// src/AuthContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null);
  const [session,      setSession]      = useState(null);
  const [shopProfile,  setShopProfile]  = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading,      setLoading]      = useState(true);

  const clearUserState = () => {
    setUser(null);
    setSession(null);
    setShopProfile(null);
    setSubscription(null);
    setIsSuperAdmin(false);
  };

  // ✅ Returns ALL data together — no partial state updates
  const loadUserData = async (userId) => {
    let shop = null, sub = null, sa = null;

    try {
      const { data } = await supabase
        .from("shop_profiles")
        .select("*")
        .eq("owner_id", userId)
        .maybeSingle();
      shop = data || null;
    } catch { /* non-fatal */ }

    try {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("owner_id", userId)
        .maybeSingle();
      sub = data || null;
    } catch { /* non-fatal */ }

    try {
      const { data } = await supabase
        .from("super_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      sa = data || null;
    } catch { /* non-fatal */ }

    // ✅ Set ALL state together after all queries finish
    // This prevents race condition where isSuperAdmin is still false
    // when AppRoutes renders
    setShopProfile(shop);
    setSubscription(sub);
    setIsSuperAdmin(!!sa);
  };

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 10000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout);
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        // ✅ Wait for ALL data before setting loading=false
        await loadUserData(session.user.id);
        setLoading(false);
      } else {
        clearUserState();
        setLoading(false);
      }
    }).catch((err) => {
      clearTimeout(timeout);
      if (err?.name === "AbortError" || err?.message?.includes("Lock")) {
        clearUserState();
      }
      setLoading(false);
    });

    const { data: { subscription: listener } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          clearUserState();
          setLoading(false);
          return;
        }
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
          setSession(session);
          setUser(session.user);
          // ✅ Wait for ALL data before setting loading=false
          await loadUserData(session.user.id);
          setLoading(false);
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      listener.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isSubscriptionActive = () => {
    if (!subscription) return true;
    if (subscription.status !== "active") return false;
    if (subscription.plan === "paid") {
      if (subscription.current_period_end) {
        return new Date(subscription.current_period_end) > new Date();
      }
      return true;
    }
    if (subscription.plan === "trial") {
      return new Date(subscription.trial_end) > new Date();
    }
    return true;
  };

  const trialDaysLeft = () => {
    if (!subscription?.trial_end) return 30;
    const diff = new Date(subscription.trial_end) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const signOut = async () => {
    clearUserState();
    await supabase.auth.signOut();
  };

  const refreshUserData = () => {
    if (user) loadUserData(user.id);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      shopProfile,
      subscription,
      isSuperAdmin,
      loading,
      isSubscriptionActive,
      trialDaysLeft,
      signOut,
      refreshUserData,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);