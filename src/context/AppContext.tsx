import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithCredential } from "firebase/auth";
import { doc, collection, setDoc, getDoc, onSnapshot, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { setupPushNotifications } from "../lib/pushNotifications";
import { Subscription, UserProfile, ReminderNotification } from "../types";
import { getAutoDetectedCurrency, getApiUrl } from "../utils";
import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";

// Initialize GoogleAuth on native platforms
if (Capacitor.isNativePlatform()) {
  try {
    GoogleAuth.initialize();
  } catch (err) {
    console.warn("GoogleAuth initialize error:", err);
  }
}

// Helper function to remove undefined properties recursively
const removeUndefined = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
  const result: any = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined) {
      result[key] = removeUndefined(val);
    }
  });
  return result;
};

interface AppContextType {
  user: User | null;
  profile: UserProfile | null;
  subscriptions: Subscription[];
  loading: boolean;
  isLocalOnly: boolean;
  currentScreen: string;
  selectedSubscriptionId: string | null;
  activeTab: string; // "home", "subscriptions", "calendar", "settings"
  stripeSandboxSession: string | null;
  paymentSuccess: boolean;
  paymentCancel: boolean;
  setScreen: (screen: string) => void;
  setTab: (tab: string) => void;
  setSelectedSubId: (id: string | null) => void;
  enableLocalOnlyMode: () => void;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  triggerLogout: () => Promise<void>;
  updateOnboardingCategories: (categories: string[]) => Promise<void>;
  unlockPremium: () => Promise<void>;
  addSubscription: (sub: Omit<Subscription, "id" | "userId" | "createdAt">) => Promise<void>;
  editSubscription: (id: string, updates: Partial<Omit<Subscription, "id" | "userId">>) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  exportLocalData: () => string;
  importLocalData: (jsonStr: string) => boolean;
  setProfileField: (field: keyof UserProfile, value: any) => Promise<void>;
  clearSandboxParams: () => void;
  verifyStripeSession: (sessId: string) => Promise<void>;
  setPaymentCancel: (val: boolean) => void;
  setPaymentSuccess: (val: boolean) => void;
  stripeCheckoutUrl: string | null;
  setStripeCheckoutUrl: (url: string | null) => void;
  paymentError: string | null;
  stripeCheckoutSessionId: string | null;
  setPaymentError: (val: string | null) => void;
  // Controls visibility of the Quick Add modal (src/components/QuickAddModal.tsx) — a
  // lightweight name+price-only entry flow, separate from the full AddEditScreen form.
  showQuickAdd: boolean;
  setShowQuickAdd: (val: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLocalOnly, setIsLocalOnly] = useState<boolean>(false);
  const [currentScreen, setCurrentScreen] = useState<string>("welcome");
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("home");

  // Keep track of real-time listeners to avoid memory leaks or duplicate subscriptions
  const unsubProfileRef = React.useRef<(() => void) | null>(null);
  const unsubSubsRef = React.useRef<(() => void) | null>(null);

  // Mirrors currentScreen so the onAuthStateChanged callback below (subscribed once,
  // with an empty dependency array) always reads the live screen instead of the
  // stale value captured when the effect first ran.
  const currentScreenRef = React.useRef<string>(currentScreen);
  useEffect(() => {
    currentScreenRef.current = currentScreen;
  }, [currentScreen]);

  // URL parameters for Stripe integration
  const [stripeSandboxSession, setStripeSandboxSession] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [paymentCancel, setPaymentCancel] = useState<boolean>(false);
  const [stripeCheckoutUrl, setStripeCheckoutUrl] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [stripeCheckoutSessionId, setStripeCheckoutSessionId] = useState<string | null>(null);

  // Quick Add modal visibility (see QuickAddModal.tsx) — a separate, lightweight
  // add-flow that lives alongside the full AddEditScreen form without modifying it.
  const [showQuickAdd, setShowQuickAdd] = useState<boolean>(false);

  // Check URL query parameters for payments/sandbox checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeSandbox = params.get("stripe_sandbox");
    const sessionId = params.get("session_id");
    const paymentStatus = params.get("payment_status");

    if (stripeSandbox === "true" && sessionId) {
      setStripeSandboxSession(sessionId);
      setCurrentScreen("stripe-sandbox");
    }

    if (paymentStatus === "success") {
      setPaymentSuccess(true);
      // If there is an active session, let's process it
      const sessId = params.get("session_id");
      if (sessId) {
        verifyStripeSession(sessId);
      }
    } else if (paymentStatus === "cancel") {
      setPaymentCancel(true);
    }
  }, []);

  const clearSandboxParams = () => {
    setPaymentSuccess(false);
    setPaymentCancel(false);
    setStripeSandboxSession(null);
    setPaymentError(null);
    setStripeCheckoutSessionId(null);
    // Clean up URL query parameters
    const url = new URL(window.location.href);
    url.searchParams.delete("stripe_sandbox");
    url.searchParams.delete("session_id");
    url.searchParams.delete("payment_status");
    window.history.replaceState({}, "", url.toString());
  };

  // Verify Stripe Session status via our Express backend
  const verifyStripeSession = async (sessId: string) => {
    try {
      const response = await fetch(getApiUrl(`/api/stripe/session-status/${sessId}`));
      if (response.ok) {
        const data = await response.json();
        if (data.payment_status === "paid") {
          // Grant Premium!
          await grantPremiumForUser(data.client_reference_id);
          // Return to settings/dashboard view where they can see upgraded premium state instantly
          setCurrentScreen("dashboard");
          setActiveTab("settings");
        }
      }
    } catch (err) {
      console.error("Error verifying payment session:", err);
    }
  };

  const grantPremiumForUser = async (uid: string) => {
    if (uid === "local" || isLocalOnly) {
      // Local premium
      const localProfile = localStorage.getItem("substracker_profile");
      if (localProfile) {
        const parsed = JSON.parse(localProfile) as UserProfile;
        parsed.isPremium = true;
        localStorage.setItem("substracker_profile", JSON.stringify(parsed));
        setProfile(parsed);
      }
    } else {
      // Firebase User premium
      try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, { isPremium: true });
      } catch (e) {
        console.error("Error upgrading user in DB:", e);
      }
    }
  };

  // Handle Firebase Sign-in redirect result on mount
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        localStorage.removeItem("substracker_google_redirect_initiated");
        if (result) {
          console.log("Successfully logged in via redirect:", result.user);
        }
      })
      .catch((error: any) => {
        console.error("Error with redirect sign-in:", error);
        const initiated = localStorage.getItem("substracker_google_redirect_initiated") === "true";
        localStorage.removeItem("substracker_google_redirect_initiated");
        if (initiated) {
          if (error && error.code) {
            localStorage.setItem("substracker_auth_redirect_error", error.code);
          } else if (error && error.message) {
            localStorage.setItem("substracker_auth_redirect_error", error.message);
          }
        }
      });
  }, []);

  // Auth & Storage Coordination
  useEffect(() => {
    // Read local mode preference
    const localPref = localStorage.getItem("substracker_local_only") === "true";
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        if (firebaseUser && !localPref) {
          // Firebase Auth is active
          setUser(firebaseUser);
          setIsLocalOnly(false);

          // Set up Capacitor push notifications
          setupPushNotifications(firebaseUser.uid);

          // Clear any stale listeners first
          if (unsubProfileRef.current) {
            unsubProfileRef.current();
            unsubProfileRef.current = null;
          }
          if (unsubSubsRef.current) {
            unsubSubsRef.current();
            unsubSubsRef.current = null;
          }

          // Fetch or create user profile in Firestore (safely handling offline/connection issues)
          const userDocRef = doc(db, "users", firebaseUser.uid);
          let currentProfile: UserProfile | null = null;

          try {
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
              currentProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                isPremium: false,
                onboarded: false,
                createdAt: new Date().toISOString(),
                selectedCategories: [],
                currency: getAutoDetectedCurrency()
              };
              await setDoc(userDocRef, currentProfile);
            } else {
              currentProfile = userDoc.data() as UserProfile;
              if (!currentProfile.currency) {
                currentProfile.currency = getAutoDetectedCurrency();
                try {
                  await updateDoc(userDocRef, { currency: currentProfile.currency });
                } catch (updateErr) {
                  console.warn("Failed to update currency field on user document:", updateErr);
                }
              }
            }
          } catch (profileErr: any) {
            console.warn("Could not get or update user profile from server (running in offline fallback):", profileErr);
            
            // Attempt to retrieve cached profile
            const cachedProfileRaw = localStorage.getItem(`substracker_profile_${firebaseUser.uid}`);
            if (cachedProfileRaw) {
              try {
                currentProfile = JSON.parse(cachedProfileRaw) as UserProfile;
              } catch (parseErr) {
                console.error("Error parsing cached profile:", parseErr);
              }
            }

            // If no cache, create a default offline-ready profile
            if (!currentProfile) {
              currentProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                isPremium: false,
                onboarded: false,
                createdAt: new Date().toISOString(),
                selectedCategories: [],
                currency: getAutoDetectedCurrency()
              };
            }
          }

          if (currentProfile) {
            setProfile(currentProfile);
            localStorage.setItem(`substracker_profile_${firebaseUser.uid}`, JSON.stringify(currentProfile));

            // Auto-route to correct screen if currently on welcome or auth screens
            if (currentScreenRef.current === "welcome" || currentScreenRef.current === "auth") {
              if (currentProfile.onboarded) {
                setCurrentScreen("dashboard");
                setActiveTab("home");
              } else {
                setCurrentScreen("onboarding");
              }
            }
          }

          // Set up real-time listener for profile modifications with error callback
          unsubProfileRef.current = onSnapshot(userDocRef, (snapshot) => {
            if (snapshot.exists()) {
              const updatedProfile = snapshot.data() as UserProfile;
              setProfile(updatedProfile);
              localStorage.setItem(`substracker_profile_${firebaseUser.uid}`, JSON.stringify(updatedProfile));
            }
          }, (err) => {
            console.warn("Profile sync error callback (offline or permission issue):", err);
          });

          // Set up real-time listener for subscriptions with error callback to prevent stuck loader
          const subsCollectionRef = collection(db, "users", firebaseUser.uid, "subscriptions");
          unsubSubsRef.current = onSnapshot(subsCollectionRef, (snapshot) => {
            const list: Subscription[] = [];
            const seenIds = new Set<string>();
            snapshot.forEach((d) => {
              const data = d.data();
              const subId = d.id; // Use Firestore document ID which is guaranteed unique
              if (!seenIds.has(subId)) {
                seenIds.add(subId);
                list.push({ ...data, id: subId } as Subscription);
              }
            });
            setSubscriptions(list);
            localStorage.setItem(`substracker_subs_${firebaseUser.uid}`, JSON.stringify(list));
            setLoading(false);
          }, (err) => {
            console.warn("Subscriptions sync error callback (using cached fallback):", err);
            
            // Try to load cached subscriptions
            const cachedSubsRaw = localStorage.getItem(`substracker_subs_${firebaseUser.uid}`);
            if (cachedSubsRaw) {
              try {
                const list = JSON.parse(cachedSubsRaw) as Subscription[];
                setSubscriptions(list);
              } catch (parseErr) {
                console.error("Failed to parse cached subscriptions:", parseErr);
              }
            }
            setLoading(false); // Critical fallback: free the loader even if permissions are failing or offline
          });

          // Sync local offline subscriptions to Firestore if they exist, to merge seamlessly
          const localSubsRaw = localStorage.getItem("substracker_subs");
          if (localSubsRaw) {
            try {
              const localSubs = JSON.parse(localSubsRaw) as Subscription[];
              if (localSubs.length > 0) {
                const batch = writeBatch(db);
                localSubs.forEach((sub) => {
                  const subId = sub.id || `sub_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                  const newDocRef = doc(db, "users", firebaseUser.uid, "subscriptions", subId);
                  batch.set(newDocRef, removeUndefined({
                    ...sub,
                    id: subId,
                    userId: firebaseUser.uid,
                    createdAt: sub.createdAt || new Date().toISOString()
                  }));
                });
                await batch.commit();
                // Clean local storage so we don't sync again
                localStorage.removeItem("substracker_subs");
              }
            } catch (e) {
              console.warn("Error migrating local subs (offline or permission issue):", e);
            }
          }

        } else {
          // Local Only Mode (or not logged in yet)
          setUser(null);

          // Clear any stale listeners first
          if (unsubProfileRef.current) {
            unsubProfileRef.current();
            unsubProfileRef.current = null;
          }
          if (unsubSubsRef.current) {
            unsubSubsRef.current();
            unsubSubsRef.current = null;
          }

          if (localPref || currentScreen === "onboarding" || currentScreen === "dashboard" || currentScreen === "settings") {
            setIsLocalOnly(true);
            
            // Load local profile
            let localProfRaw = localStorage.getItem("substracker_profile");
            let currentProfile: UserProfile;
            if (!localProfRaw) {
              currentProfile = {
                uid: "local",
                email: null,
                isPremium: false,
                onboarded: false,
                createdAt: new Date().toISOString(),
                selectedCategories: [],
                currency: getAutoDetectedCurrency()
              };
              localStorage.setItem("substracker_profile", JSON.stringify(currentProfile));
            } else {
              currentProfile = JSON.parse(localProfRaw) as UserProfile;
              if (!currentProfile.currency) {
                currentProfile.currency = getAutoDetectedCurrency();
                localStorage.setItem("substracker_profile", JSON.stringify(currentProfile));
              }
            }
            setProfile(currentProfile);

            // Load local subscriptions
            const localSubsRaw = localStorage.getItem("substracker_subs");
            let currentSubs: Subscription[] = [];
            if (localSubsRaw) {
              try {
                const parsed = JSON.parse(localSubsRaw) as Subscription[];
                const seen = new Set<string>();
                currentSubs = parsed.filter((sub) => {
                  if (!sub.id || seen.has(sub.id)) return false;
                  seen.add(sub.id);
                  return true;
                });
              } catch (e) {
                console.error("Failed to parse local subscriptions:", e);
              }
            }
            setSubscriptions(currentSubs);
          } else {
            setProfile(null);
            setSubscriptions([]);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Error inside onAuthStateChanged handler:", err);
        setLoading(false); // Critical fallback: release loading screen in case of any database/auth error
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfileRef.current) {
        unsubProfileRef.current();
        unsubProfileRef.current = null;
      }
      if (unsubSubsRef.current) {
        unsubSubsRef.current();
        unsubSubsRef.current = null;
      }
    };
  }, [currentScreen, isLocalOnly]);

  // Screen/Tab Routing Controls
  const setScreen = (screen: string) => {
    setCurrentScreen(screen);
  };

  const setTab = (tab: string) => {
    setActiveTab(tab);
    setCurrentScreen("dashboard");
  };

  const setSelectedSubId = (id: string | null) => {
    setSelectedSubscriptionId(id);
  };

  // Local-only mode activation
  const enableLocalOnlyMode = () => {
    localStorage.setItem("substracker_local_only", "true");
    setIsLocalOnly(true);
    
    // Setup initial local profile
    const currentProfile: UserProfile = {
      uid: "local",
      email: null,
      isPremium: false,
      onboarded: false,
      createdAt: new Date().toISOString(),
      selectedCategories: [],
      currency: getAutoDetectedCurrency()
    };
    localStorage.setItem("substracker_profile", JSON.stringify(currentProfile));
    setProfile(currentProfile);
    setSubscriptions([]);
    
    setScreen("onboarding");
  };

  // Authentication Handlers
  const signUpWithEmail = async (email: string, pass: string) => {
    localStorage.removeItem("substracker_local_only");
    await createUserWithEmailAndPassword(auth, email, pass);
    setScreen("plan");
  };

  const signInWithEmail = async (email: string, pass: string) => {
    localStorage.removeItem("substracker_local_only");
    const credentials = await signInWithEmailAndPassword(auth, email, pass);
    
    // Fetch profile to check onboarding
    const userDocRef = doc(db, "users", credentials.user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists() && (userDoc.data() as UserProfile).onboarded) {
      setScreen("dashboard");
      setActiveTab("home");
    } else {
      setScreen("onboarding");
    }
  };

  const signInWithGoogle = async () => {
    localStorage.removeItem("substracker_local_only");

    // 1. If running on a native platform (Android/iOS app), use native Capacitor GoogleAuth
    if (Capacitor.isNativePlatform()) {
      try {
        console.log("[Google Auth] Initiating native Google Sign-In via Capacitor...");
        const result = (await GoogleAuth.signIn()) as any;
        const idToken = result?.authentication?.idToken || result?.idToken;
        if (!idToken) {
          throw new Error("No ID Token returned from native Google Sign-In.");
        }
        
        const credential = GoogleAuthProvider.credential(idToken);
        const credentials = await signInWithCredential(auth, credential);

        // Fetch profile to check onboarding
        const userDocRef = doc(db, "users", credentials.user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && (userDoc.data() as UserProfile).onboarded) {
          setScreen("dashboard");
          setActiveTab("home");
        } else if (!userDoc.exists()) {
          // Brand new account: route through the Plan step, same as email sign-up
          setScreen("plan");
        } else {
          setScreen("onboarding");
        }
        return;
      } catch (nativeErr: any) {
        console.error("[Google Auth] Native Google Sign-In failed:", nativeErr);
        throw nativeErr;
      }
    }

    // 2. Otherwise, fall back to the standard web provider with signInWithPopup
    const provider = new GoogleAuthProvider();
    
    // Force prompt on Google Sign-In to let users choose/switch accounts easily
    provider.setCustomParameters({
      prompt: "select_account"
    });

    try {
      const credentials = await signInWithPopup(auth, provider);

      // Fetch profile to check onboarding
      const userDocRef = doc(db, "users", credentials.user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists() && (userDoc.data() as UserProfile).onboarded) {
        setScreen("dashboard");
        setActiveTab("home");
      } else if (!userDoc.exists()) {
        // Brand new account: route through the Plan step, same as email sign-up
        setScreen("plan");
      } else {
        setScreen("onboarding");
      }
    } catch (popupError: any) {
      console.warn("Popup sign-in failed/blocked:", popupError);
      throw popupError;
    }
  };

  const triggerLogout = async () => {
    localStorage.removeItem("substracker_local_only");
    localStorage.removeItem("substracker_profile");
    localStorage.removeItem("substracker_subs");
    setIsLocalOnly(false);
    setProfile(null);
    setSubscriptions([]);

    // Also sign out of the native Google session, otherwise the Capacitor GoogleAuth
    // plugin silently re-signs the user into the same cached account next time,
    // skipping the account picker.
    if (Capacitor.isNativePlatform()) {
      try {
        await GoogleAuth.signOut();
      } catch (err) {
        console.warn("GoogleAuth signOut error:", err);
      }
    }

    await signOut(auth);
    setScreen("welcome");
  };

  const updateOnboardingCategories = async (categories: string[]) => {
    if (!profile) return;
    const updated = { ...profile, onboarded: true, selectedCategories: categories };
    
    if (isLocalOnly || profile.uid === "local") {
      localStorage.setItem("substracker_profile", JSON.stringify(updated));
      setProfile(updated);
    } else {
      const userRef = doc(db, "users", profile.uid);
      await updateDoc(userRef, {
        onboarded: true,
        selectedCategories: categories
      });
    }
    setScreen("dashboard");
    setActiveTab("home");
  };

  // Manual payment trigger (Calls Server for Checkout Session)
  const unlockPremium = async () => {
    const activeProfile = profile || {
      uid: "local",
      email: "sandbox@example.com",
      isPremium: false,
      onboarded: true,
      createdAt: new Date().toISOString(),
      selectedCategories: [],
      currency: getAutoDetectedCurrency()
    };
    
    setPaymentError(null);
    setStripeCheckoutSessionId(null);
    
    try {
      const response = await fetch(getApiUrl("/api/stripe/create-checkout-session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeProfile.uid,
          userEmail: activeProfile.email || "sandbox@example.com",
          appUrl: window.location.origin,
        }),
      });

      if (response.ok) {
        const session = await response.json();
        const urlStr = session.url;
        
        // If it's a sandbox/simulation URL, parse the parameters and route internally instantly
        if (urlStr && (urlStr.includes("stripe_sandbox=true") || urlStr.startsWith("/?"))) {
          const fakeUrlObj = new URL(urlStr, window.location.origin);
          const sessionId = fakeUrlObj.searchParams.get("session_id") || session.id;
          
          if (sessionId) {
            setStripeSandboxSession(sessionId);
            setCurrentScreen("stripe-sandbox");
            
            // Update browser URL without reload so user can copy-paste/bookmark if they wish
            window.history.pushState({}, "", urlStr);
            return;
          }
        }
        
        // External redirect for real Stripe
        if (urlStr) {
          setStripeCheckoutUrl(urlStr);
          setStripeCheckoutSessionId(session.id);
          
          const isIframe = window.self !== window.top;
          const isMobileOrCapacitor = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || Capacitor.isNativePlatform();
          
          if (!isIframe && !isMobileOrCapacitor) {
            // Only perform automatic silent redirection if NOT in an iframe AND NOT on mobile/Capacitor
            try {
              window.location.href = urlStr;
            } catch (e) {
              console.warn("Direct navigation failed. Falling back to checkout choice modal.", e);
            }
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error || "Failed to create Stripe Checkout session. Please check your Stripe configurations or try again later.";
        console.error("Stripe Checkout error:", msg);
        setPaymentError(msg);
      }
    } catch (err: any) {
      console.error("Error creating stripe checkout:", err);
      setPaymentError(err.message || "A network error occurred. Please check your internet connection and try again.");
    }
  };

  // Subscription Database Actions (Add, Edit, Delete)
  const addSubscription = async (sub: Omit<Subscription, "id" | "userId" | "createdAt">) => {
    if (!profile) return;

    // Free plan constraint check: Limit to 5 subscriptions
    if (!profile.isPremium && subscriptions.length >= 5) {
      throw new Error("Free Plan limit reached. Unlock Premium for unlimited subscription tracking!");
    }

    const subId = `sub_${Date.now()}`;
    const newSub: Subscription = {
      ...sub,
      id: subId,
      userId: profile.uid,
      createdAt: new Date().toISOString(),
    };

    if (isLocalOnly || profile.uid === "local") {
      const updatedList = [...subscriptions, newSub];
      localStorage.setItem("substracker_subs", JSON.stringify(updatedList));
      setSubscriptions(updatedList);
    } else {
      const docRef = doc(db, "users", profile.uid, "subscriptions", subId);
      await setDoc(docRef, removeUndefined(newSub));
    }
  };

  const editSubscription = async (id: string, updates: Partial<Omit<Subscription, "id" | "userId">>) => {
    if (!profile) return;

    if (isLocalOnly || profile.uid === "local") {
      const updatedList = subscriptions.map((s) => {
        if (s.id === id) {
          return { ...s, ...updates };
        }
        return s;
      });
      localStorage.setItem("substracker_subs", JSON.stringify(updatedList));
      setSubscriptions(updatedList);
    } else {
      const docRef = doc(db, "users", profile.uid, "subscriptions", id);
      await updateDoc(docRef, removeUndefined(updates));
    }
  };

  const deleteSubscription = async (id: string) => {
    if (!profile) return;

    if (isLocalOnly || profile.uid === "local") {
      const updatedList = subscriptions.filter((s) => s.id !== id);
      localStorage.setItem("substracker_subs", JSON.stringify(updatedList));
      setSubscriptions(updatedList);
    } else {
      const docRef = doc(db, "users", profile.uid, "subscriptions", id);
      await deleteDoc(docRef);
    }

    if (selectedSubscriptionId === id) {
      setSelectedSubscriptionId(null);
    }
  };

  // Restore purchase simulation
  const restorePurchases = async () => {
    if (!profile) return;
    // Look up in Firestore or force premium simulation on click
    await grantPremiumForUser(profile.uid);
  };

  const exportLocalData = () => {
    const data = {
      profile,
      subscriptions
    };
    return JSON.stringify(data, null, 2);
  };

  const importLocalData = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && Array.isArray(parsed.subscriptions)) {
        if (isLocalOnly || profile?.uid === "local") {
          localStorage.setItem("substracker_subs", JSON.stringify(parsed.subscriptions));
          setSubscriptions(parsed.subscriptions);
          if (parsed.profile) {
            const mergedProfile = { ...profile, ...parsed.profile, uid: "local" };
            localStorage.setItem("substracker_profile", JSON.stringify(mergedProfile));
            setProfile(mergedProfile);
          }
        } else if (profile?.uid) {
          // Restore to Firebase via a batch
          const batch = writeBatch(db);
          parsed.subscriptions.forEach((sub: any) => {
            const subId = sub.id || `sub_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const docRef = doc(db, "users", profile.uid, "subscriptions", subId);
            batch.set(docRef, removeUndefined({
              ...sub,
              id: subId,
              userId: profile.uid,
              createdAt: sub.createdAt || new Date().toISOString()
            }));
          });
          batch.commit();
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed importing subscription database data:", e);
      return false;
    }
  };

  const setProfileField = async (field: keyof UserProfile, value: any) => {
    if (!profile) return;
    const updated = { ...profile, [field]: value };
    if (isLocalOnly || profile.uid === "local") {
      localStorage.setItem("substracker_profile", JSON.stringify(updated));
      setProfile(updated);
    } else {
      const userRef = doc(db, "users", profile.uid);
      await updateDoc(userRef, { [field]: value });
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        profile,
        subscriptions,
        loading,
        isLocalOnly,
        currentScreen,
        selectedSubscriptionId,
        activeTab,
        stripeSandboxSession,
        paymentSuccess,
        paymentCancel,
        setScreen,
        setTab,
        setSelectedSubId,
        enableLocalOnlyMode,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        triggerLogout,
        updateOnboardingCategories,
        unlockPremium,
        addSubscription,
        editSubscription,
        deleteSubscription,
        restorePurchases,
        exportLocalData,
        importLocalData,
        setProfileField,
        clearSandboxParams,
        verifyStripeSession,
        setPaymentCancel,
        setPaymentSuccess,
        stripeCheckoutUrl,
        setStripeCheckoutUrl,
        paymentError,
        stripeCheckoutSessionId,
        setPaymentError,
        showQuickAdd,
        setShowQuickAdd,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
