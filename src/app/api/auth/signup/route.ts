import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { validateEmail, validateName, validatePassword } from "@/lib/password";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendEmailVerification } from "@/lib/email";
import { generateEmailVerificationToken } from "@/lib/tokens";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { allowed, retryAfterSeconds } = checkRateLimit(ip, "signup");
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many signup attempts. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.` },
        { status: 429 }
      );
    }
    const body = await request.json();
    const { name, email, password } = body;

    // Validate name
    const nameError = validateName(name);
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }

    // Validate email
    const emailError = validateEmail(email);
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 });
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

    // Send verification email — must be awaited before returning in serverless environments
    try {
      const verificationToken = await generateEmailVerificationToken(normalizedEmail);
      const baseUrl = process.env.NEXTAUTH_URL || "https://www.datainterviewcoach.com";
      const verifyUrl = `${baseUrl}/verify-email?token=${verificationToken.token}`;
      await sendEmailVerification(normalizedEmail, name.trim(), verifyUrl);
    } catch (emailErr) {
      // Don't fail signup if email fails — user can resend from check-email page
      console.error("Failed to send verification email:", emailErr);
    }

    return NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email } },
      { status: 201 }
    );
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
