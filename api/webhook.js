import admin from "firebase-admin";
import { NextResponse } from "next/server";

// 🔷 Decode Base64 service account from env
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || "";
const serviceAccountJson = Buffer.from(serviceAccountBase64, "base64").toString("utf8");
const serviceAccount = JSON.parse(serviceAccountJson);

// 🔷 Init Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export async function POST(req) {
  const body = await req.json();
  const queryText = body?.queryResult?.queryText?.toLowerCase() || "";
  console.log("👉 User said:", queryText);

  // Default response
  let responseText = "🤔 Sorry, I didn’t understand that. Please ask about club or teacher announcements.";

  // Detect type from text
  let type = null;
  if (queryText.includes("club")) {
    type = "club";
  } else if (queryText.includes("teacher")) {
    type = "teacher";
  }

  if (type) {
    const snapshot = await db.collection("announcements").where("type", "==", type).get();

    if (snapshot.empty) {
      responseText = `🚫 No upcoming ${type} announcements found.`;
    } else {
      responseText = `📢 Here are the upcoming ${type} announcements:\n\n`;
      snapshot.forEach((doc) => {
        const a = doc.data();
        responseText += `• *${a.title}* by ${a.authorName}: ${a.description}\n`;
      });
    }
  }

  return NextResponse.json({ fulfillmentText: responseText });
}

export function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
  });
}
