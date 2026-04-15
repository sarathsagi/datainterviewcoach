import { randomBytes } from "crypto";
import { prisma } from "./db";

export async function generatePasswordResetToken(email: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Delete any existing tokens for this email
  await prisma.passwordResetToken.deleteMany({
    where: { email },
  });

  const resetToken = await prisma.passwordResetToken.create({
    data: {
      email,
      token,
      expires,
    },
  });

  return resetToken;
}

export async function verifyPasswordResetToken(token: string) {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) return null;
  if (resetToken.expires < new Date()) {
    // Clean up expired token
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
    return null;
  }

  return resetToken;
}

export async function consumePasswordResetToken(token: string) {
  const resetToken = await verifyPasswordResetToken(token);
  if (!resetToken) return null;

  await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
  return resetToken;
}

// ─── Email Verification Tokens ──────────────────────────────

export async function generateEmailVerificationToken(email: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Delete any existing tokens for this email
  await prisma.emailVerificationToken.deleteMany({
    where: { email },
  });

  const verificationToken = await prisma.emailVerificationToken.create({
    data: {
      email,
      token,
      expires,
    },
  });

  return verificationToken;
}

export async function consumeEmailVerificationToken(token: string) {
  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { token },
  });

  if (!verificationToken) return null;
  if (verificationToken.expires < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });
    return null;
  }

  await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });
  return verificationToken;
}
