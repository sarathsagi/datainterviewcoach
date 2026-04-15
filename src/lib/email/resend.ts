import { Resend } from "resend";

let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM = process.env.EMAIL_FROM || "Data Interview Coach <noreply@datainterviewcoach.com>";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  // In development without an API key, log instead of sending
  if (!process.env.RESEND_API_KEY) {
    // Extract URLs from the HTML for easy click-through in dev
    const urlMatch = html.match(/href="(http[^"]*(?:verify-email|reset-password)[^"]*)"/);
    console.log(`\n📧 Email (dev mode — no RESEND_API_KEY set)`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    if (urlMatch) console.log(`   🔗 Action URL: ${urlMatch[1]}`);
    console.log(`   Preview: email content logged but not sent\n`);
    return { success: true, id: "dev-mode" };
  }

  const client = getResendClient();
  const { data, error } = await client.emails.send({
    from: FROM,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("Failed to send email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return { success: true, id: data?.id };
}
