/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");
const {getFirestore} = require("firebase-admin/firestore");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Function to generate Islamic email HTML content
function generateEmailHtml(userName) {
  const name = userName || 'Brother/Sister';
  
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .bismillah { font-size: 24px; text-align: center; margin-bottom: 20px; }
          h1 { color: #2F855A; }
          .cta-button { 
            display: inline-block; 
            background-color: #2F855A; 
            color: white; 
            padding: 10px 20px; 
            text-decoration: none; 
            border-radius: 5px; 
          }
          .footer { font-style: italic; margin-top: 30px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="bismillah">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</div>
          <p>Assalamu Alaikum ${name},</p>
          <h1>Daily Reminder</h1>
          <p>This is a friendly reminder to update your daily activities if you haven't already done so.</p>
          <p>Tracking your prayers and activities helps maintain consistency in your worship and personal growth.</p>
          <p>
            <a href="https://your-app-url.com" class="cta-button">Update Now</a>
          </p>
          <p>May Allah make it easy for you to fulfill your obligations and grant you success in this world and the hereafter.</p>
          <p class="footer">Jazak Allah Khair</p>
        </div>
      </body>
    </html>
  `;
}

// Function to send emails
async function sendEmail(recipients, subject, body) {
  // Get email credentials from environment variables
  const senderEmail = "msargames119@gmail.com";
  const password = "iqaz qutn uhdt nsuc"; // Consider using environment variables for this

  if (!senderEmail || !password) {
    logger.error("Missing email credentials");
    return { status: "error", message: "Missing email credentials" };
  }

  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: senderEmail,
      pass: password,
    },
  });

  // Ensure recipients is an array
  if (typeof recipients === 'string') {
    recipients = [recipients];
  }

  // Create mail options
  const mailOptions = {
    from: senderEmail,
    to: recipients.join(', '),
    subject: subject,
    html: body,
  };

  try {
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    logger.info("Email sent successfully", { messageId: info.messageId });
    return { status: "success", message: "Email sent successfully" };
  } catch (error) {
    logger.error("Error sending email", { error: error.message });
    return { status: "error", message: error.message };
  }
}

// Scheduled function to send emails daily at 8 PM
exports.sendDailyReminder = onSchedule("every day 20:00", async (event) => {
  try {
    // Get users from Firestore
    const db = getFirestore();
    const usersSnapshot = await db.collection("users")
      .where("emailNotificationsEnabled", "==", true)
      .get();
    
    if (usersSnapshot.empty) {
      logger.info("No users with notifications enabled");
      return;
    }
    
    // Extract email addresses and names
    const recipients = [];
    const userNames = {};
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.email) {
        recipients.push(userData.email);
        userNames[userData.email] = userData.displayName || userData.name;
      }
    });
    
    if (recipients.length === 0) {
      logger.info("No user emails found");
      return;
    }
    
    // Send individual emails with personalized content
    for (const email of recipients) {
      const userName = userNames[email];
      const subject = "Daily Activity Reminder";
      const body = generateEmailHtml(userName);
      
      await sendEmail(email, subject, body);
      logger.info(`Reminder sent to ${email}`);
    }
    
  } catch (error) {
    logger.error("Error in scheduled email function", { error: error.message });
  }
});

// Test endpoint to manually trigger the email sending (for development)
exports.testSendEmail = onRequest(async (request, response) => {
  try {
    const email = request.query.email;
    
    if (!email) {
      response.status(400).json({ error: "Email parameter is required" });
      return;
    }
    
    const subject = "Daily Activity Reminder";
    const body = generateEmailHtml();
    
    const result = await sendEmail(email, subject, body);
    response.json(result);
  } catch (error) {
    logger.error("Error in test email function", { error: error.message });
    response.status(500).json({ error: error.message });
  }
});
