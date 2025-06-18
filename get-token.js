require('dotenv').config({ path: '.env-local' });
console.log('Client ID:', process.env.GMAIL_CLIENT_ID);
console.log('Client Secret:', process.env.GMAIL_CLIENT_SECRET);
console.log('Redirect URI:', process.env.GMAIL_REDIRECT_URI);


const { google } = require("googleapis");
const readline = require("readline");

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
});

console.log("🔗 Visit this URL to authorize the app:", authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("👉 Paste the code you get after authorizing: ", (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error("❌ Error retrieving access token", err);
    console.log("✅ Your refresh token is:", token.refresh_token);
  });
});
