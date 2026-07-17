import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { db } from './firebase'; // Your Firestore instance
import { doc, setDoc } from 'firebase/firestore';

// Module-level guards so the event listeners are only ever registered once per
// app session, regardless of how many times onAuthStateChanged re-invokes this
// (previously each call added another listener, causing duplicate FCM writes).
let listenersInitialized = false;
let currentUserId: string | null = null;

// Call this function after the user logs in
export const setupPushNotifications = async (userId: string) => {
  // Guard clause to prevent browser preview crashes
  if (!Capacitor.isNativePlatform()) {
    console.log("[Push Notifications] Running in browser preview. Skipping native push registration.");
    return;
  }

  currentUserId = userId;

  try {
    // 1. Request permission
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn("User denied push notification permissions");
      return;
    }

    // 2. Register with FCM
    await PushNotifications.register();

    if (listenersInitialized) return;
    listenersInitialized = true;

    // 3. Listen for successful registration & send the token to your Firestore backend
    await PushNotifications.addListener('registration', async (token) => {
      console.log('FCM Token generated:', token.value);

      if (!currentUserId) return;
      // Save to Firestore under the schema we set up: /users/{userId}/fcmTokens/{tokenId}
      const tokenRef = doc(db, 'users', currentUserId, 'fcmTokens', token.value);
      await setDoc(tokenRef, {
        token: token.value,
        deviceModel: navigator.userAgent || "Android Device",
        updatedAt: new Date().toISOString()
      });
    });

    // 4. Handle incoming notification while the app is open (foreground)
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received in foreground: ', notification);
      // You can show a custom toast/modal in-app here if you like
    });
  } catch (err) {
    console.error("[Push Notifications] Error setting up native push notifications:", err);
  }
};
