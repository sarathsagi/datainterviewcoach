const baseStyles = `
  body { margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
  .card { background-color: #1e293b; border-radius: 12px; padding: 40px 32px; border: 1px solid #334155; }
  .logo { text-align: center; margin-bottom: 24px; }
  .logo-icon { display: inline-block; width: 48px; height: 48px; background-color: #4f46e5; border-radius: 10px; line-height: 48px; text-align: center; font-size: 24px; }
  h1 { color: #ffffff; font-size: 22px; text-align: center; margin: 0 0 8px; }
  .subtitle { color: #94a3b8; font-size: 14px; text-align: center; margin: 0 0 32px; }
  p { color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
  .btn { display: block; text-align: center; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 24px 0; }
  .btn:hover { background-color: #4338ca; }
  .link { color: #818cf8; word-break: break-all; font-size: 12px; }
  .footer { text-align: center; margin-top: 24px; color: #64748b; font-size: 12px; }
  .divider { border: none; border-top: 1px solid #334155; margin: 24px 0; }
  .muted { color: #64748b; font-size: 12px; }
`;

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Data Interview Coach</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <div class="logo-icon">🧠</div>
      </div>
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Data Interview Coach. All rights reserved.</p>
      <p>datainterviewcoach.com</p>
    </div>
  </div>
</body>
</html>`;
}

export function passwordResetEmail(name: string, resetUrl: string): { subject: string; html: string } {
  return {
    subject: "Reset your password — Data Interview Coach",
    html: layout(`
      <h1>Reset Your Password</h1>
      <p class="subtitle">We received a request to reset your password</p>
      <p>Hi ${name || "there"},</p>
      <p>Someone requested a password reset for your Data Interview Coach account. Click the button below to set a new password:</p>
      <a href="${resetUrl}" class="btn">Reset Password</a>
      <p class="muted">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't be changed.</p>
      <hr class="divider" />
      <p class="muted">If the button doesn't work, copy and paste this URL into your browser:</p>
      <p class="link">${resetUrl}</p>
    `),
  };
}

export function welcomeEmail(name: string): { subject: string; html: string } {
  return {
    subject: "Welcome to Data Interview Coach! 🚀",
    html: layout(`
      <h1>Welcome to Data Interview Coach!</h1>
      <p class="subtitle">Your data engineering interview prep journey starts now</p>
      <p>Hi ${name || "there"},</p>
      <p>Thanks for creating your account! You've just taken the first step toward acing your data engineering interviews.</p>
      <p>Here's what you can do next:</p>
      <ul style="color: #cbd5e1; font-size: 14px; line-height: 1.8; padding-left: 20px;">
        <li><strong style="color: #ffffff;">Complete your profile</strong> — Set your target companies and interview date</li>
        <li><strong style="color: #ffffff;">Get your study plan</strong> — AI generates a personalized day-by-day plan</li>
        <li><strong style="color: #ffffff;">Start practicing</strong> — Python, SQL, System Design, Data Modeling &amp; more</li>
      </ul>
      <a href="${process.env.NEXTAUTH_URL || "https://datainterviewcoach.com"}/dashboard" class="btn">Go to Dashboard</a>
      <p class="muted">If you have any questions, just reply to this email. We're here to help!</p>
    `),
  };
}

export function emailVerificationEmail(name: string, verifyUrl: string): { subject: string; html: string } {
  return {
    subject: "Verify your email — Data Interview Coach",
    html: layout(`
      <h1>Verify Your Email</h1>
      <p class="subtitle">One quick step to get started</p>
      <p>Hi ${name || "there"},</p>
      <p>Thanks for signing up for Data Interview Coach! Please verify your email address by clicking the button below:</p>
      <a href="${verifyUrl}" class="btn">Verify Email Address</a>
      <p class="muted">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
      <hr class="divider" />
      <p class="muted">If the button doesn't work, copy and paste this URL into your browser:</p>
      <p class="link">${verifyUrl}</p>
    `),
  };
}
