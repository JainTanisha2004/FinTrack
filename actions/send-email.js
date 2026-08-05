"use server"
import { Resend } from "resend";

export async function sendEmail({ to, subject, react }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Wealth <onboarding@resend.dev>";

  if (!apiKey) {
    const error = new Error("RESEND_API_KEY is not configured.");
    console.error("Failed to send email:", error.message);
    return { success: false, error };
  }

  const resend = new Resend(apiKey);

  try {
    const data = await resend.emails.send({
      from,
      to,
      subject,
      react,
    });

    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
}