import admin from "firebase-admin";

export function initializeFirebase() {
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log("🔥 Firebase Admin initialized");
    } else if (!admin.apps.length) {
      console.warn(
        "⚠️ GOOGLE_APPLICATION_CREDENTIALS not set. Firebase Admin not initialized."
      );
    }
  } catch (error) {
    console.error("❌ Firebase initialization error:", error);
  }
}

export const messaging =  admin.messaging;
