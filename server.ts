import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, updateDoc, collection, getDocs, collectionGroup, query, where } from "firebase/firestore";
import admin from "firebase-admin";
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

// Lazy-initialized Firebase Admin SDK
let adminApp: any = null;
function getFirebaseAdmin(): any {
  if (adminApp) return adminApp;

  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountStr) {
    try {
      const serviceAccount = JSON.parse(serviceAccountStr);
      adminApp = (admin as any).initializeApp({
        credential: (admin as any).credential.cert(serviceAccount),
      }, "admin-app");
      console.log("[Firebase Admin] Successfully initialized Firebase Admin SDK");
    } catch (err) {
      console.error("[Firebase Admin] Error parsing service account JSON:", err);
    }
  } else {
    console.log("[Firebase Admin] No FIREBASE_SERVICE_ACCOUNT_JSON found in environment. FCM notifications will run in Demo/Log mode.");
  }
  return adminApp;
}

// Lazy-initialized Stripe instance
let stripe: Stripe | null = null;
function getStripeInstance(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (secretKey && !stripe) {
    stripe = new Stripe(secretKey);
  }
  return stripe;
}

// In-memory tracker for demo sessions to simulate status checks
const demoSessions = new Map<string, { userId: string; email: string; status: string }>();

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // API Route to send a test FCM push notification manually
  app.post("/api/notifications/send", async (req, res) => {
    try {
      const { userId, title, body } = req.body;
      if (!userId || !title || !body) {
        return res.status(400).json({ error: "Missing required fields: userId, title, body" });
      }

      // 1. Fetch FCM tokens for the user from Firestore
      const tokensRef = collection(db, "users", userId, "fcmTokens");
      const tokensSnap = await getDocs(tokensRef);
      const tokens: string[] = [];
      tokensSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.token) {
          tokens.push(data.token);
        }
      });

      if (tokens.length === 0) {
        return res.json({
          success: false,
          message: "No registered Android FCM devices found for this user. Register a token in your Android Studio project first!",
        });
      }

      console.log(`[FCM Notification] Sending alert to ${tokens.length} devices of user ${userId}: "${title}"`);

      // 2. Try sending using Admin SDK
      const adminSDK = getFirebaseAdmin();
      if (adminSDK) {
        const messaging = adminSDK.messaging();
        const sendPromises = tokens.map((token) => {
          return messaging.send({
            token,
            notification: { title, body },
            android: {
              priority: "high",
              notification: {
                sound: "default",
                channelId: "renewals_channel",
              },
            },
          });
        });

        const results = await Promise.allSettled(sendPromises);
        const successes = results.filter((r) => r.status === "fulfilled").length;
        const failures = results.filter((r) => r.status === "rejected").length;

        return res.json({
          success: true,
          sentCount: successes,
          failCount: failures,
          message: `FCM push completed: ${successes} succeeded, ${failures} failed.`,
        });
      } else {
        // Fallback demo/log mode
        return res.json({
          success: true,
          demoMode: true,
          tokensSent: tokens,
          message: `[Demo Mode] No FIREBASE_SERVICE_ACCOUNT_JSON configured. The server simulated pushing to tokens: ${tokens.join(", ")}`,
        });
      }
    } catch (err: any) {
      console.error("Error sending push notification:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route to manually trigger/simulate checking all active subscriptions and sending reminders
  app.post("/api/notifications/trigger-alerts-check", async (req, res) => {
    try {
      console.log("[Alerts Checker] Starting automated alerts scan...");
      const subscriptionsRef = collectionGroup(db, "subscriptions");
      
      // Get all active subscriptions
      const q = query(subscriptionsRef, where("status", "==", "active"));
      const querySnapshot = await getDocs(q);
      
      const alertsSent: any[] = [];
      const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      
      for (const docSnap of querySnapshot.docs) {
        const sub = docSnap.data();
        const userId = sub.userId;
        if (!userId) continue;

        // Calculate reminder date based on nextChargeDate and reminderTiming
        const chargeDate = new Date(sub.nextChargeDate);
        if (isNaN(chargeDate.getTime())) continue;

        let daysBefore = 0;
        switch (sub.reminderTiming) {
          case "same-day": daysBefore = 0; break;
          case "1-day": daysBefore = 1; break;
          case "2-days": daysBefore = 2; break;
          case "3-days": daysBefore = 3; break;
          case "7-days": daysBefore = 7; break;
          default: continue; // No reminders set
        }

        const reminderDate = new Date(chargeDate);
        reminderDate.setDate(chargeDate.getDate() - daysBefore);
        const reminderDateStr = reminderDate.toISOString().split("T")[0];

        // If today is the reminder date, trigger push!
        if (reminderDateStr === todayStr) {
          const title = `Subscription Renewal Alert: ${sub.name}`;
          const body = `Your ${sub.name} subscription (${sub.currency || "$"}${sub.amount}) renews on ${sub.nextChargeDate}. Please review.`;

          // Fetch tokens for this user
          const tokensRef = collection(db, "users", userId, "fcmTokens");
          const tokensSnap = await getDocs(tokensRef);
          const tokens: string[] = [];
          tokensSnap.forEach((tSnap) => {
            const tData = tSnap.data();
            if (tData.token) tokens.push(tData.token);
          });

          if (tokens.length > 0) {
            console.log(`[Alerts Checker] Found ${tokens.length} tokens for user ${userId}. Sending push...`);
            const adminSDK = getFirebaseAdmin();
            if (adminSDK) {
              const messaging = adminSDK.messaging();
              const sendPromises = tokens.map((token) => {
                return messaging.send({
                  token,
                  notification: { title, body },
                  android: {
                    priority: "high",
                    notification: {
                      sound: "default",
                      channelId: "renewals_channel",
                    },
                  },
                });
              });
              await Promise.allSettled(sendPromises);
            }
            alertsSent.push({
              userId,
              subName: sub.name,
              nextChargeDate: sub.nextChargeDate,
              sentToTokens: tokens.length,
            });
          }
        }
      }

      res.json({
        success: true,
        checkedCount: querySnapshot.size,
        alertsSentCount: alertsSent.length,
        alertsSent,
      });
    } catch (error: any) {
      console.error("[Alerts Checker] Error during alert checking:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for creating Stripe Checkout Session
  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    try {
      const { userId, userEmail, appUrl } = req.body;
      const hostUrl = appUrl || process.env.APP_URL || `http://localhost:${PORT}`;

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
      res.status(500).json({ error: error.message });
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
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
  });
}

startServer();
