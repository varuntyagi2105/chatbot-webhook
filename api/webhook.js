import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// initialize Firebase Admin SDK
const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8")
);

if (!global._firebaseApp) {
  global._firebaseApp = initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  // 🔷 CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ fulfillmentText: "Method not allowed" });
  }

  try {
    const intentName = req.body?.queryResult?.intent?.displayName || "";

    if (intentName !== "GetClubAnnouncements") {
      return res
        .status(400)
        .json({ fulfillmentText: "Unknown intent: " + intentName });
    }

    const snapshot = await db
      .collection("announcements")
      .where("type", "==", "club")
      .get();

    if (snapshot.empty) {
      return res
        .status(200)
        .json({ fulfillmentText: "No upcoming club announcements found." });
    }

    let responseText = "📢 Here are the upcoming club announcements:\n\n";
    snapshot.forEach((doc) => {
      const a = doc.data();
      responseText += `🎉 *${a.title}* by ${a.authorName}: ${a.description}\n`;
    });

    return res.status(200).json({ fulfillmentText: responseText.trim() });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ fulfillmentText: "Internal server error fetching announcements." });
  }
}
