import formData from "form-data";
import Mailgun from "mailgun.js";
import dotenv from "dotenv";

dotenv.config();

const mailgun = new Mailgun(formData);

export const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
});

/**
 * Send email via Mailgun
 */
export const sendMail = async (to, subject, text, html) => {
  try {
    await mg.messages.create(process.env.MAILGUN_DOMAIN, {
      from: `Reigna Care <no-reply@${process.env.MAILGUN_DOMAIN}>`,
      to,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error("❌ Mailgun Error:", err.message);
    throw new Error("Email sending failed");
  }
};
