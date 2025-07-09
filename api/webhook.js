import admin from "firebase-admin";
import { NextResponse } from "next/server";

let db;

try {
  if (!admin.apps.length) {
    const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!base64) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64 env variable!");

    const jsonStr = Buffer.from(base64, "base64").toString("utf8");
    const serviceAccount = JSON.parse(jsonStr);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  db = admin.firestore();
} catch (err) {
  console.error("🔥 Firebase init error:", err);
}

export async function POST(req) {
  if (!db) {
    return NextResponse.json({ fulfillmentText: "Server misconfigured: Firebase not initialized." }, { status: 500 });
  }

  const body = await req.json();
  const queryText = body?.queryResult?.queryText?.toLowerCase() || "";
  console.log("👉 User said:", queryText);

  let responseText = "🤔 Sorry, I didn’t understand that. Please ask about club or teacher announcements.";

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
//ff
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
