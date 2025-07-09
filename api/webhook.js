const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");

const app = express();
app.use(bodyParser.json());

// Decode service account key from BASE64
const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
if (!base64Key) {
  console.error("FIREBASE_SERVICE_ACCOUNT_BASE64 is not set!");
  process.exit(1);
}
const serviceAccount = JSON.parse(
  Buffer.from(base64Key, "base64").toString("utf8")
);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

app.post("/api/webhook", async (req, res) => {
  const queryResult = req.body.queryResult;
  const intent = queryResult.intent.displayName;

  if (intent === "GetClubAnnouncements") {
    try {
      const now = Date.now();
      const snapshot = await db
        .collection("announcements")
        .where("type", "==", "club")
        .where("timestamp", ">", now)
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
});

// ✅ Print server started when running locally
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ Server started on port ${PORT}`);
  });
}

module.exports = app;
