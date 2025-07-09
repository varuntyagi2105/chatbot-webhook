const admin = require("firebase-admin");

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!base64) throw new Error("❌ Missing FIREBASE_SERVICE_ACCOUNT_BASE64!");

  const jsonStr = Buffer.from(base64, "base64").toString("utf8");
  const serviceAccount = JSON.parse(jsonStr);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase Admin initialized");
}

const db = admin.firestore();

module.exports = async (req, res) => {
  // CORS headers
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
    const body = req.body;
    const queryText = body?.queryResult?.queryText?.toLowerCase() || "";
    console.log("👉 User said:", queryText);

    let responseText =
      "🤔 Sorry, I didn’t understand that. Please ask about *club* or *teacher* announcements.";

    let type = null;

    if (queryText.includes("club")) {
      type = "club";
    } else if (queryText.includes("teacher")) {
      type = "teacher";
    }

    if (type) {
      const snapshot = await db
        .collection("announcements")
        .where("type", "==", type)
        .get();

      if (snapshot.empty) {
        responseText = `🚫 No upcoming ${type} announcements found.`;
      } else {
        const lines = snapshot.docs.map((doc) => {
          const a = doc.data();
          return `• *${a.title}* by ${a.authorName}: ${a.description}`;
        });

        responseText = `📢 Here are the upcoming ${type} announcements:\n\n` + lines.join("\n");
      }
    }

    res.json({ fulfillmentText: responseText });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({
      fulfillmentText: "⚠️ An internal error occurred. Please try again later.",
    });
  }
};
