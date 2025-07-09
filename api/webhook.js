const admin = require("firebase-admin");

if (!admin.apps.length) {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!base64) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64!");

  const jsonStr = Buffer.from(base64, "base64").toString("utf8");
  const serviceAccount = JSON.parse(jsonStr);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ fulfillmentText: "Method not allowed" });
  }

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
      responseText = `📢 Here are the upcoming ${type} announcements:\n`;

      let count = 1;

      snapshot.forEach((doc) => {
        const a = doc.data();
        responseText += `\n${count}️⃣\n`;
        responseText += `Title: ${a.title}\n`;
        responseText += `Organizer: ${a.authorName}\n`;
        responseText += `Description: ${a.description}\n`;
        count++;
      });
    }
  }

  res.json({ fulfillmentText: responseText.trim() });
};
