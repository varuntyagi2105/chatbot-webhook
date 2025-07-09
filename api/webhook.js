const admin = require("firebase-admin");

// Only initialize admin once
if (!admin.apps.length) {
  const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!base64Key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is not set!");
  }
  const serviceAccount = JSON.parse(
    Buffer.from(base64Key, "base64").toString("utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).send("✅ Server is working");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const queryResult = req.body.queryResult;
  const intent = queryResult?.intent?.displayName;

  if (intent === "GetClubAnnouncements") {
    try {
      const now = Date.now();
      const snapshot = await db
        .collection("announcements")
        .where("type", "==", "club")
        .orderBy("timestamp", "asc")
        .get();

      if (snapshot.empty) {
        return res.json({
          fulfillmentText: "There are no upcoming club announcements at the moment.",
        });
      }

      let responseText = "📢 Here are the upcoming club announcements:\n";
      snapshot.forEach((doc) => {
        const data = doc.data();
        responseText += `\n🎉 *${data.title}* by ${data.authorName}: ${data.description}`;
      });

      return res.json({ fulfillmentText: responseText });
    } catch (err) {
      console.error(err);
      return res.json({
        fulfillmentText: "Sorry, I couldn't fetch the club announcements due to an error.",
      });
    }
  } else {
    return res.json({ fulfillmentText: "I’m not sure how to help with that." });
  }
}
