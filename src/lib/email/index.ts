import { sendEmail } from "./resend";
import {
  passwordResetEmail,
  welcomeEmail,
  emailVerificationEmail,
} from "./templates";

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
) {
  const { subject, html } = passwordResetEmail(name, resetUrl);
  return sendEmail({ to, subject, html });
}

export async function sendWelcomeEmail(to: string, name: string) {
  const { subject, html } = welcomeEmail(name);
  return sendEmail({ to, subject, html });
}

export async function sendEmailVerification(
  to: string,
  name: string,
  verifyUrl: string
) {
  const { subject, html } = emailVerificationEmail(name, verifyUrl);
  return sendEmail({ to, subject, html });
}
