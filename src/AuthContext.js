import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null);
  const [shopProfile,  setShopProfile]  = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading,      setLoading]      = useState(true);
  const mountedRef = useRef(true);

  const loadUserData = async (userId) => {
    const [shopRes, subRes, saRes] = await Promise.allSettled([
      supabase.from("shop_profiles").select("*").eq("owner_id", userId).maybeSingle(),
      supabase.from("subscriptions").select("*").eq("owner_id", userId).maybeSingle(),
      supabase.from("super_admins").select("user_id").eq("user_id", userId).maybeSingle(),
    ]);
    if (!mountedRef.current) return;
    if (shopRes.status === "fulfilled") setShopProfile(shopRes.value.data || null);
    if (subRes.status  === "fulfilled") setSubscription(subRes.value.data || null);
    if (saRes.status   === "fulfilled") setIsSuperAdmin(!!saRes.value.data);
  };

  useEffect(() => {
    mountedRef.current = true;
    let listener = null;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mountedRef.current) return;
        if (session?.user) {
          setUser(session.user);
          await loadUserData(session.user.id);
        }
      } catch(e) {
        console.error("Auth init:", e);
      } finally {
        if (mountedRef.current) setLoading(false);
      }

      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mountedRef.current) return;
        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          await loadUserData(session.user.id);
          if (mountedRef.current) setLoading(false);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setShopProfile(null);
          setSubscription(null);
          setIsSuperAdmin(false);
          if (mountedRef.current) setLoading(false);
        }
      });
      listener = data;
    };

    init();

    return () => {
      mountedRef.current = false;
      listener?.subscription?.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isSubscriptionActive = () => {
    if (!subscription) return true;
    if (subscription.status !== "active") return false;
    if (subscription.plan === "trial") return new Date(subscription.trial_end) > new Date();
    if (subscription.current_period_end) return new Date(subscription.current_period_end) > new Date();
    return true;
  };

  const trialDaysLeft = () => {
    if (!subscription?.trial_end) return 30;
    return Math.ceil((new Date(subscription.trial_end) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const signOut = () => {
    localStorage.removeItem("medstock-auth");
    localStorage.removeItem("medstock-auth-token");
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("sb-") || key.includes("supabase")) {
        localStorage.removeItem(key);
      }
    });
    supabase.auth.signOut().catch(() => {});
    window.location.href = "/";
  };

  const refreshUserData = () => { if (user) loadUserData(user.id); };

  return (
    <AuthContext.Provider value={{
      user, shopProfile, subscription, isSuperAdmin, loading,
      isSubscriptionActive, trialDaysLeft, signOut, refreshUserData,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
