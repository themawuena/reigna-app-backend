import axios from "axios";
import { GoogleAuth } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();

// 🔹 Load your Firebase project ID
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

// 🔹 Path to your service account key
const SERVICE_ACCOUNT_PATH = "./src/config/firebase-service-account.json";

// 🔹 Initialize Google Auth
const googleAuth = new GoogleAuth({
  keyFile: SERVICE_ACCOUNT_PATH,
  scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
});

// ✅ Send push notification using HTTP v1 API
export const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  try {
    if (!fcmToken) {
      console.warn("⚠️ No FCM token available for this user");
      return;
    }

    // 🔹 Generate access token
    const client = await googleAuth.getClient();
    const accessToken = await client.getAccessToken();

    const payload = {
      message: {
        token: fcmToken,
        notification: { title, body },
        data: data,
        android: { priority: "high" },
      },
    };

    // 🔹 Send to FCM HTTP v1 endpoint
    const response = await axios.post(
      `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Push notification sent:", response.data);
  } catch (error) {
    console.error(
      "❌ Error sending push notification:",
      error.response?.data || error.message
    );
  }
};
