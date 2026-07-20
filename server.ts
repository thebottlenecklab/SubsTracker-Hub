import express from "express";
import path from "path";
import fs from "fs";
import Stripe from "stripe";
import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, updateDoc, deleteDoc, collection, getDocs, collectionGroup, query, where } from "firebase/firestore";
import { initializeApp as initializeAdminApp, cert as adminCert } from "firebase-admin/app";
import { getMessaging, Messaging } from "firebase-admin/messaging";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Read Firebase configuration from firebase-applet-config.json as a fallback
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};

const firebaseConfig = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || config.projectId,
  appId: process.env.VITE_FIREBASE_APP_ID || config.appId,
  apiKey: process.env.VITE_FIREBASE_API_KEY || config.apiKey,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || config.authDomain,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || config.storageBucket,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || config.measurementId || ""
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = initializeFirestore(firebaseApp, {
  ignoreUndefinedProperties: true
}, process.env.VITE_FIREBASE_DATABASE_ID || config.firestoreDatabaseId || "(default)");

async function grantPremiumForUserInFirebase(uid: string) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { isPremium: true });
    console.log(`[Firebase Server Webhook] Successfully upgraded user ${uid} to Premium`);
  } catch (err) {
    console.error("[Firebase Server Webhook] Error updating user profile:", err);
  }
}

// Lazy-initialized Firebase Admin SDK messaging client.
//
// BUG FIX: this previously called admin.credential.cert(...) and app.messaging()
// (the classic firebase-admin namespaced API), but the installed firebase-admin
// version (14.x) only ships the newer modular API — there is no `.credential`
// property and no `.messaging()` method on the app instance anymore. That mismatch
// made every call throw "Cannot read properties of undefined (reading 'cert')",
// which was silently swallowed by the catch block below, so getFirebaseAdmin()
// always returned null and every push notification route quietly fell back to
// Demo Mode even with FIREBASE_SERVICE_ACCOUNT_JSON correctly configured. Fixed by
// using firebase-admin/app's cert()/initializeApp() and firebase-admin/messaging's
// getMessaging(), which is the supported API for this version.
let adminMessaging: Messaging | null = null;
function getFirebaseAdmin(): Messaging | null {
  if (adminMessaging) return adminMessaging;

  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountStr) {
    try {
      const serviceAccount = JSON.parse(serviceAccountStr);
      const adminApp = initializeAdminApp({
        credential: adminCert(serviceAccount),
      }, "admin-app");
      adminMessaging = getMessaging(adminApp);
      console.log("[Firebase Admin] Successfully initialized Firebase Admin SDK");
    } catch (err) {
      console.error("[Firebase Admin] Error parsing service account JSON:", err);
    }
  } else {
    console.log("[Firebase Admin] No FIREBASE_SERVICE_ACCOUNT_JSON found in environment. FCM notifications will run in Demo/Log mode.");
  }
  return adminMessaging;
}

// Lazy-initialized Stripe instance
let stripe: Stripe | null = null;
let currentActiveSecretKey: string | null = null;

function getStripeInstance(): Stripe | null {
  let secretKey: string | null = null;

  // 1. Read directly from .env to see if user has uncommented STRIPE_SECRET_KEY
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      const lines = envContent.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        // Match only UNCOMMENTED lines starting with STRIPE_SECRET_KEY=
        if (trimmed.startsWith("STRIPE_SECRET_KEY=")) {
          const match = trimmed.match(/^STRIPE_SECRET_KEY=["']?(.*?)["']?$/);
          if (match && match[1]) {
            secretKey = match[1];
            break;
          }
        }
      }
    }
  } catch (err) {
    console.error("[Stripe Config] Error parsing .env directly:", err);
  }

  // 2. If STRIPE_SECRET_KEY was not found active (uncommented) in .env, load from stripe-test-keys.json
  if (!secretKey) {
    try {
      const testKeysPath = path.join(process.cwd(), "stripe-test-keys.json");
      if (fs.existsSync(testKeysPath)) {
        const testKeysContent = fs.readFileSync(testKeysPath, "utf8");
        const parsed = JSON.parse(testKeysContent);
        if (parsed && parsed.STRIPE_SECRET_KEY) {
          secretKey = parsed.STRIPE_SECRET_KEY;
        }
      }
    } catch (err) {
      console.error("[Stripe Config] Error reading stripe-test-keys.json fallback:", err);
    }
  }

  // 3. Fallback to process.env if still not set
  if (!secretKey) {
    secretKey = process.env.STRIPE_SECRET_KEY || null;
  }

  if (secretKey) {
    // If stripe instance is not yet initialized, or the key has changed, re-initialize it
    if (!stripe || currentActiveSecretKey !== secretKey) {
      stripe = new Stripe(secretKey);
      currentActiveSecretKey = secretKey;
      console.log(`[Stripe Config] Initialized Stripe instance with key starting with: ${secretKey.slice(0, 7)}...`);
    }
  } else {
    stripe = null;
    currentActiveSecretKey = null;
  }
  return stripe;
}

// In-memory tracker for demo sessions to simulate status checks
const demoSessions = new Map<string, { userId: string; email: string; status: string }>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Allow cross-origin requests from the native Android/iOS app, which serves its bundled
  // WebView content from https://localhost or capacitor://localhost — a different origin
  // than this API, so without these headers the browser blocks every fetch() with a CORS error.
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  // Stripe Webhook Endpoint (Must be defined BEFORE app.use(express.json()) to receive raw body)
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    const stripeInstance = getStripeInstance();
    if (!stripeInstance) {
      return res.status(400).send("Stripe secret key not configured on server.");
    }

    let event: Stripe.Event;

    try {
      if (webhookSecret && sig) {
        event = stripeInstance.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        // Fallback for visual dashboard webhook checks / testing if secret is not set yet
        const bodyStr = req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body);
        event = JSON.parse(bodyStr);
      }
    } catch (err: any) {
      console.error(`[Stripe Webhook] Verification Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      if (userId) {
        await grantPremiumForUserInFirebase(userId);
      }
    }

    res.json({ received: true });
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // API Route to directly echo and prompt native file downloads (bypassing sandbox / iframe limitations)
  app.post("/api/export-csv", (req, res) => {
    try {
      const { csvData, filename } = req.body;
      const safeFilename = filename || `SubsTracker_Hub_Backup_${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
      res.send(csvData || "");
    } catch (err: any) {
      console.error("Error in server-side export CSV:", err);
      res.status(500).send("Error exporting CSV");
    }
  });

  // API Route to send a test FCM push notification manually. Delegates to
  // sendPushToUserTokens (defined below) so this route gets the same per-token
  // failure logging and stale-token cleanup as the automated alert checks, instead of
  // duplicating the send logic a third time.
  app.post("/api/notifications/send", async (req, res) => {
    try {
      const { userId, title, body } = req.body;
      if (!userId || !title || !body) {
        return res.status(400).json({ error: "Missing required fields: userId, title, body" });
      }

      console.log(`[FCM Notification] Test notification requested by user ${userId}: "${title}"`);
      const result = await sendPushToUserTokens(userId, title, body);

      if (result.tokenCount === 0) {
        return res.json({
          success: false,
          message: "No registered Android FCM devices found for this user. Register a token in your Android Studio project first!",
        });
      }

      if (result.demoMode) {
        return res.json({
          success: true,
          demoMode: true,
          message: `[Demo Mode] No FIREBASE_SERVICE_ACCOUNT_JSON configured. The server simulated ${result.tokenCount} push(es) without sending.`,
        });
      }

      return res.json({
        success: true,
        sentCount: result.sentCount,
        failCount: result.failCount,
        staleTokensRemoved: result.staleRemoved,
        message: `FCM push completed: ${result.sentCount} succeeded, ${result.failCount} failed.` +
          (result.staleRemoved > 0 ? ` Removed ${result.staleRemoved} stale device token(s) that will no longer be used.` : ""),
      });
    } catch (err: any) {
      console.error("Error sending push notification:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // FCM error codes that mean the token is permanently dead (app uninstalled, token
  // rotated, etc.) rather than a transient failure — safe to delete from Firestore.
  // See: https://firebase.google.com/docs/cloud-messaging/send-message#admin-sdk-errors
  const STALE_TOKEN_ERROR_CODES = new Set([
    "messaging/registration-token-not-registered",
    "messaging/invalid-argument",
    "messaging/invalid-registration-token",
  ]);

  // Shared helper: sends one FCM push to every device token registered for a user
  // (at Firestore path users/{userId}/fcmTokens, written by src/lib/pushNotifications.ts).
  // Extracted so both alert checks below and the manual test-send route reuse the same
  // send + failure-handling logic instead of duplicating it three times.
  //
  // Previously this only returned tokens.length (how many sends were *attempted*), and
  // failures were silently discarded by Promise.allSettled with no logging — there was
  // no way to tell a real delivery from one that failed, or to know why. Now it logs
  // each failure's actual FCM error code/message, and removes tokens that FCM confirms
  // are permanently dead (STALE_TOKEN_ERROR_CODES above) so they stop being counted as
  // a "registered device" on every future send — this is the fix for tokens
  // accumulating from repeated app reinstalls during testing/updates.
  async function sendPushToUserTokens(userId: string, title: string, body: string): Promise<{ tokenCount: number; sentCount: number; failCount: number; staleRemoved: number; demoMode: boolean }> {
    const tokensRef = collection(db, "users", userId, "fcmTokens");
    const tokensSnap = await getDocs(tokensRef);
    const tokens: string[] = [];
    tokensSnap.forEach((tSnap) => {
      const tData = tSnap.data();
      if (tData.token) tokens.push(tData.token);
    });

    if (tokens.length === 0) return { tokenCount: 0, sentCount: 0, failCount: 0, staleRemoved: 0, demoMode: false };

    const messaging = getFirebaseAdmin();
    if (!messaging) {
      // Demo mode: no Admin SDK configured, nothing was actually sent.
      return { tokenCount: tokens.length, sentCount: 0, failCount: 0, staleRemoved: 0, demoMode: true };
    }

    const results = await Promise.allSettled(
      tokens.map((token) =>
        messaging.send({
          token,
          notification: { title, body },
          android: {
            priority: "high",
            notification: { sound: "default", channelId: "renewals_channel" },
          },
        })
      )
    );

    const staleTokens: string[] = [];
    let sentCount = 0;
    let failCount = 0;

    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        sentCount++;
      } else {
        failCount++;
        const err: any = r.reason;
        console.error(`[FCM Notification] Send failed for user ${userId}, token ${tokens[i].slice(0, 12)}...: ${err?.code || "unknown"} - ${err?.message || err}`);
        if (STALE_TOKEN_ERROR_CODES.has(err?.code)) {
          staleTokens.push(tokens[i]);
        }
      }
    });

    if (staleTokens.length > 0) {
      // Firestore doc IDs are the token value itself (see setDoc call in
      // src/lib/pushNotifications.ts), so each stale token maps directly to a doc path.
      await Promise.allSettled(
        staleTokens.map((token) => deleteDoc(doc(db, "users", userId, "fcmTokens", token)))
      );
      console.log(`[FCM Notification] Removed ${staleTokens.length} stale/dead token(s) for user ${userId}.`);
    }

    return { tokenCount: tokens.length, sentCount, failCount, staleRemoved: staleTokens.length, demoMode: false };
  }

  // Scans every active subscription for an upcoming renewal (based on nextChargeDate +
  // reminderTiming) and sends a push for any that are due today. Extracted into its own
  // function (previously inline in the route below) so the daily fallback scheduler
  // further down can call the exact same check outside of an HTTP request.
  async function runRenewalAlertsCheck(): Promise<{ checkedCount: number; alertsSent: any[] }> {
    const subscriptionsRef = collectionGroup(db, "subscriptions");
    const q = query(subscriptionsRef, where("status", "==", "active"));
    const querySnapshot = await getDocs(q);

    const alertsSent: any[] = [];
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    for (const docSnap of querySnapshot.docs) {
      const sub = docSnap.data();
      const userId = sub.userId;
      if (!userId) continue;

      // Skip gracefully if this subscription has no usable renewal date.
      const chargeDate = new Date(sub.nextChargeDate);
      if (isNaN(chargeDate.getTime())) continue;

      // These case values must match ReminderTiming in src/types.ts exactly
      // ("none" | "on_day" | "1_day_before" | "3_days_before" | "7_days_before") —
      // the previous version of this switch used different strings ("same-day",
      // "1-day", etc.) that never matched real data, so no alert ever fired.
      let daysBefore = 0;
      switch (sub.reminderTiming) {
        case "on_day": daysBefore = 0; break;
        case "1_day_before": daysBefore = 1; break;
        case "3_days_before": daysBefore = 3; break;
        case "7_days_before": daysBefore = 7; break;
        default: continue; // "none" or unset — no reminder wanted for this subscription
      }

      const reminderDate = new Date(chargeDate);
      reminderDate.setDate(chargeDate.getDate() - daysBefore);
      const reminderDateStr = reminderDate.toISOString().split("T")[0];

      // If today is the reminder date, trigger push! This works the same regardless of
      // billingCycle (weekly/monthly/quarterly/yearly) since nextChargeDate already
      // holds the concrete next charge date for any cycle type.
      if (reminderDateStr === todayStr) {
        const title = `Subscription Renewal Alert: ${sub.name}`;
        const body = `Your ${sub.name} subscription (${sub.currency || "$"}${sub.amount}) renews on ${sub.nextChargeDate}. Please review.`;
        const { sentCount } = await sendPushToUserTokens(userId, title, body);
        if (sentCount > 0) {
          console.log(`[Alerts Checker] Sent renewal alert for "${sub.name}" to ${sentCount} device(s) of user ${userId}.`);
          alertsSent.push({ userId, subName: sub.name, nextChargeDate: sub.nextChargeDate, sentToTokens: sentCount });
        }
      }
    }

    return { checkedCount: querySnapshot.size, alertsSent };
  }

  // Scans every active free-trial subscription for a trial end date (freeTrialEndDate)
  // approaching within the subscription's own reminderTiming lead time, and sends a
  // distinct "trial ending" push. Kept separate from runRenewalAlertsCheck because
  // freeTrialEndDate and nextChargeDate are independent, separately user-entered fields
  // (see AddEditScreen.tsx) — a trial's end date isn't guaranteed to equal its charge date.
  async function runFreeTrialAlertsCheck(): Promise<{ checkedCount: number; alertsSent: any[] }> {
    const subscriptionsRef = collectionGroup(db, "subscriptions");
    const q = query(subscriptionsRef, where("status", "==", "active"));
    const querySnapshot = await getDocs(q);

    const alertsSent: any[] = [];
    const todayStr = new Date().toISOString().split("T")[0];

    for (const docSnap of querySnapshot.docs) {
      const sub = docSnap.data();
      const userId = sub.userId;

      // Skip gracefully: only relevant for free trials that actually have an end date set.
      if (!userId || !sub.isFreeTrial || !sub.freeTrialEndDate) continue;

      const trialEndDate = new Date(sub.freeTrialEndDate);
      if (isNaN(trialEndDate.getTime())) continue; // Skip gracefully on a bad/missing date

      // Reuses the subscription's own reminderTiming preference so trial-end alerts
      // respect the same lead time the user already chose for renewal alerts.
      let daysBefore = 0;
      switch (sub.reminderTiming) {
        case "on_day": daysBefore = 0; break;
        case "1_day_before": daysBefore = 1; break;
        case "3_days_before": daysBefore = 3; break;
        case "7_days_before": daysBefore = 7; break;
        default: continue;
      }

      const reminderDate = new Date(trialEndDate);
      reminderDate.setDate(trialEndDate.getDate() - daysBefore);
      const reminderDateStr = reminderDate.toISOString().split("T")[0];

      if (reminderDateStr === todayStr) {
        const title = `Free Trial Ending: ${sub.name}`;
        const body = `Your ${sub.name} free trial ends on ${sub.freeTrialEndDate}. It will convert to a paid subscription unless cancelled.`;
        const { sentCount } = await sendPushToUserTokens(userId, title, body);
        if (sentCount > 0) {
          console.log(`[Alerts Checker] Sent trial-ending alert for "${sub.name}" to ${sentCount} device(s) of user ${userId}.`);
          alertsSent.push({ userId, subName: sub.name, freeTrialEndDate: sub.freeTrialEndDate, sentToTokens: sentCount });
        }
      }
    }

    return { checkedCount: querySnapshot.size, alertsSent };
  }

  // API Route to manually trigger/simulate checking all active subscriptions and sending
  // renewal reminders. Behavior is unchanged from before — it just now delegates to the
  // extracted runRenewalAlertsCheck() function above instead of inlining the loop here.
  app.post("/api/notifications/trigger-alerts-check", async (req, res) => {
    try {
      console.log("[Alerts Checker] Starting automated alerts scan...");
      const { checkedCount, alertsSent } = await runRenewalAlertsCheck();
      res.json({
        success: true,
        checkedCount,
        alertsSentCount: alertsSent.length,
        alertsSent,
      });
    } catch (error: any) {
      console.error("[Alerts Checker] Error during alert checking:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to manually trigger a free-trial-ending scan, mirroring the renewal route
  // above. Exposed separately so it can be tested/invoked independently if needed.
  app.post("/api/notifications/trigger-trial-alerts-check", async (req, res) => {
    try {
      console.log("[Trial Alerts Checker] Starting free-trial alerts scan...");
      const { checkedCount, alertsSent } = await runFreeTrialAlertsCheck();
      res.json({
        success: true,
        checkedCount,
        alertsSentCount: alertsSent.length,
        alertsSent,
      });
    } catch (error: any) {
      console.error("[Trial Alerts Checker] Error during trial alert checking:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for creating Stripe Checkout Session
  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    try {
      const { userId, userEmail, appUrl } = req.body;
      let hostUrl = appUrl || process.env.APP_URL || `http://localhost:${PORT}`;

      // If requested from a mobile wrapper APK or local-only scheme (capacitor://, file://, localhost, etc.)
      // replace hostUrl with the public Cloud Run server's HTTPS URL to ensure Stripe doesn't crash on invalid redirect schemes,
      // and redirecting works smoothly inside the default web browser.
      //
      // BUG FIX: this previously only matched "http://localhost" (and 127.0.0.1 over
      // http), but Capacitor's Android WebView serves the bundled app from
      // "https://localhost" (HTTPS, not HTTP) — that slipped past every check here, so
      // Stripe's post-payment redirect pointed the phone's browser at an unreachable
      // https://localhost URL ("connection refused"), even though the payment itself
      // succeeded. Switched to substring checks so the scheme (http/https) no longer
      // matters.
      if (
        !hostUrl ||
        hostUrl.includes("localhost") ||
        hostUrl.includes("127.0.0.1") ||
        hostUrl.startsWith("capacitor://") ||
        hostUrl.startsWith("file://") ||
        hostUrl.startsWith("ionic://") ||
        hostUrl.startsWith("chrome-extension://")
      ) {
        const reqHost = req.get("host");
        if (reqHost) {
          const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
          hostUrl = `${isSecure ? "https" : "http"}://${reqHost}`;
        }
      }

      const stripeInstance = getStripeInstance();

      if (stripeInstance) {
        // Real Stripe checkout session
        const session = await stripeInstance.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: "SubsTracker Premium (Lifetime)",
                  description: "Manual subscription entry, renewal reminders, trial tracking, sync, priority support, and more.",
                },
                unit_amount: 1999, // $19.99
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          customer_email: userEmail || undefined,
          client_reference_id: userId,
          success_url: `${hostUrl}/?payment_status=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${hostUrl}/?payment_status=cancel`,
        });

        res.json({ id: session.id, url: session.url });
      } else {
        // Stripe secret key is missing -> Fall back to Sandbox Demo Session
        const demoSessionId = `demo_session_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        demoSessions.set(demoSessionId, {
          userId: userId || "anonymous",
          email: userEmail || "sandbox@example.com",
          status: "pending",
        });

        // Redirect to our customized Sandbox Checkout Page in the React application
        const sandboxUrl = `/?stripe_sandbox=true&session_id=${demoSessionId}&userId=${userId || "anonymous"}&email=${encodeURIComponent(userEmail || "sandbox@example.com")}`;
        res.json({ id: demoSessionId, url: sandboxUrl });
      }
    } catch (error: any) {
      console.error("Error creating stripe checkout session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to fetch Checkout Session Status (both real and demo)
  app.get("/api/stripe/session-status/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;

      if (sessionId.startsWith("demo_session_")) {
        const demoSession = demoSessions.get(sessionId);
        if (demoSession) {
          res.json({
            status: "complete",
            payment_status: demoSession.status === "completed" ? "paid" : "unpaid",
            client_reference_id: demoSession.userId,
            customer_email: demoSession.email,
          });
        } else {
          res.status(404).json({ error: "Demo session not found" });
        }
      } else {
        const stripeInstance = getStripeInstance();
        if (!stripeInstance) {
          return res.status(400).json({ error: "Stripe key not configured" });
        }

        const session = await stripeInstance.checkout.sessions.retrieve(sessionId);
        res.json({
          status: session.status,
          payment_status: session.payment_status,
          client_reference_id: session.client_reference_id,
          customer_email: session.customer_details?.email,
        });
      }
    } catch (error: any) {
      console.error("Error retrieving checkout session:", error);
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  });

  // API Route to finalize Sandbox payment (only used in demo mode to mark it complete)
  app.post("/api/stripe/sandbox-complete", (req, res) => {
    const { sessionId } = req.body;
    if (sessionId && demoSessions.has(sessionId)) {
      const session = demoSessions.get(sessionId)!;
      session.status = "completed";
      demoSessions.set(sessionId, session);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Session not found" });
    }
  });

  // Serve static files in production, or mount Vite dev server in development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, watch: { ignored: ["**/android/**"] } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);

    // Daily fallback reminder scheduler. Nothing previously called
    // /api/notifications/trigger-alerts-check on any schedule, so renewal/trial alerts
    // only ever fired if someone hit that route by hand. This runs both checks once on
    // startup (catches anything missed while the server was down) and then every 24h
    // for as long as this process stays alive, as an in-process fallback.
    //
    // Caveat: this only re-checks daily while the server process is actually running.
    // If this is deployed to a Cloud Run service that scales to zero when idle (as
    // documented for this project), the process — and this interval — stops between
    // requests, so a Cloud Scheduler job hitting trigger-alerts-check on a fixed daily
    // schedule is still the reliable option for production. Not set up automatically
    // here since it provisions new cloud infrastructure.
    const runDailyFallbackChecks = async () => {
      try {
        const renewalResult = await runRenewalAlertsCheck();
        const trialResult = await runFreeTrialAlertsCheck();
        console.log(
          `[Daily Fallback Check] Renewals: ${renewalResult.alertsSent.length}/${renewalResult.checkedCount} alerted. ` +
          `Trials: ${trialResult.alertsSent.length}/${trialResult.checkedCount} alerted.`
        );
      } catch (err) {
        console.error("[Daily Fallback Check] Error:", err);
      }
    };

    runDailyFallbackChecks();
    setInterval(runDailyFallbackChecks, 24 * 60 * 60 * 1000);
  });
}

startServer();
