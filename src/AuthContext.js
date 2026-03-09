import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext({});

export function AuthProvider({ children }) {

  const [user, setUser] = useState(null);
  const [shopProfile, setShopProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);

  // LOAD USER RELATED DATA
  const loadUserData = async (userId) => {

    try {

      const [shopRes, subRes, saRes] = await Promise.allSettled([
        supabase.from("shop_profiles").select("*").eq("owner_id", userId).maybeSingle(),
        supabase.from("subscriptions").select("*").eq("owner_id", userId).maybeSingle(),
        supabase.from("super_admins").select("user_id").eq("user_id", userId).maybeSingle(),
      ]);

      if (!mountedRef.current) return;

      setShopProfile(
        shopRes.status === "fulfilled" ? shopRes.value.data || null : null
      );

      setSubscription(
        subRes.status === "fulfilled" ? subRes.value.data || null : null
      );

      setIsSuperAdmin(
        saRes.status === "fulfilled" ? !!saRes.value.data : false
      );

    } catch (err) {
      console.error("User data load error:", err);
    }

  };

  useEffect(() => {

    mountedRef.current = true;

    let authListener = null;

    const initializeAuth = async () => {

      try {

        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        if (!mountedRef.current) return;

        if (session?.user) {
          setUser(session.user);
          await loadUserData(session.user.id);
        }

      } catch (err) {
        console.error("Auth init error:", err);
      } finally {

        if (mountedRef.current) {
          setLoading(false);
        }

      }

      const { data: listener } = supabase.auth.onAuthStateChange(
        async (event, session) => {

          if (!mountedRef.current) return;

          if (event === "SIGNED_IN" && session?.user) {

            setUser(session.user);
            await loadUserData(session.user.id);

          }

          if (event === "SIGNED_OUT") {

            setUser(null);
            setShopProfile(null);
            setSubscription(null);
            setIsSuperAdmin(false);

          }

        }
      );

      authListener = listener;

    };

    initializeAuth();

    return () => {

      mountedRef.current = false;

      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }

    };

  }, []);

  // SUBSCRIPTION HELPERS

  const isSubscriptionActive = () => {

    if (!subscription) return true;

    if (subscription.status !== "active") return false;

    if (subscription.plan === "trial") {
      return new Date(subscription.trial_end) > new Date();
    }

    if (subscription.current_period_end) {
      return new Date(subscription.current_period_end) > new Date();
    }

    return true;

  };

  const trialDaysLeft = () => {

    if (!subscription?.trial_end) return 30;

    return Math.ceil(
      (new Date(subscription.trial_end) - new Date()) /
      (1000 * 60 * 60 * 24)
    );

  };

  // LOGOUT (mobile safe)

  const signOut = async () => {

    try {

      await supabase.auth.signOut();

      localStorage.clear();
      sessionStorage.clear();

    } catch (err) {
      console.error("Logout error:", err);
    }

    window.location.replace("/");

  };

  const refreshUserData = () => {

    if (user) {
      loadUserData(user.id);
    }

  };

  return (

    <AuthContext.Provider
      value={{
        user,
        shopProfile,
        subscription,
        isSuperAdmin,
        loading,
        isSubscriptionActive,
        trialDaysLeft,
        signOut,
        refreshUserData,
      }}
    >

      {children}

    </AuthContext.Provider>

  );

}

export const useAuth = () => useContext(AuthContext);