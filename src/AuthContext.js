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

  const loadUserData = async (userId) => {
    try {
      const { data: shop } = await supabase
        .from("shop_profiles")
        .select("*")
        .eq("owner_id", userId)
        .maybeSingle();
      setShopProfile(shop || null);
    } catch { /* non-fatal */ }

    try {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("owner_id", userId)
        .maybeSingle();
      setSubscription(sub || null);
    } catch { /* non-fatal */ }

    try {
      const { data: sa } = await supabase
        .from("super_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      setIsSuperAdmin(!!sa);
    } catch { /* non-fatal */ }
  };

  useEffect(() => {
    // Add a 10 second timeout — if Supabase doesn't respond, show login anyway
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 10000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch(() => {
      clearTimeout(timeout);
      setLoading(false);
    });

    const { data: { subscription: listener } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadUserData(session.user.id);
        } else {
          setShopProfile(null);
          setSubscription(null);
          setIsSuperAdmin(false);
        }
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(timeout);
      listener.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isSubscriptionActive = () => {
    if (!subscription) return true;                        // no sub data yet → allow in
    if (subscription.status !== "active") return false;   // suspended / cancelled
    if (subscription.plan === "paid") {
      // paid: valid as long as current_period_end is in future
      if (subscription.current_period_end) {
        return new Date(subscription.current_period_end) > new Date();
      }
      return true; // no end date set → treat as active
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
