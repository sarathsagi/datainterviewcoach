import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Data Interview Coach",
  description: "Privacy Policy for Data Interview Coach",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-invert prose-slate max-w-none">
      <h1>Privacy Policy</h1>
      <p className="text-slate-400 text-sm">Last updated: April 15, 2026</p>

      <p>
        Data Interview Coach (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your privacy.
        This Privacy Policy explains how we collect, use, disclose, and protect
        your information when you use our website at{" "}
        <strong>datainterviewcoach.com</strong> (the &quot;Service&quot;).
      </p>

      <h2>1. Information We Collect</h2>

      <h3>Information You Provide</h3>
      <ul>
        <li>
          <strong>Account information:</strong> Name, email address, and password
          when you create an account.
        </li>
        <li>
          <strong>Profile information:</strong> Target companies, interview dates,
          skill level, and study preferences provided during onboarding.
        </li>
        <li>
          <strong>Payment information:</strong> Billing details processed securely
          through Stripe. We do not store your credit card numbers on our servers.
        </li>
        <li>
          <strong>User content:</strong> Code solutions, notes, and other content
          you submit while using the Service.
        </li>
      </ul>

      <h3>Information Collected Automatically</h3>
      <ul>
        <li>
          <strong>Usage data:</strong> Pages visited, features used, practice
          sessions completed, time spent, and study progress.
        </li>
        <li>
          <strong>Device information:</strong> Browser type, operating system, and
          device type.
        </li>
        <li>
          <strong>Log data:</strong> IP address, access times, and referring URLs.
        </li>
      </ul>

      <h3>Information from Third Parties</h3>
      <ul>
        <li>
          <strong>OAuth providers:</strong> If you sign in with Google or GitHub,
          we receive your name, email address, and profile picture from those
          services.
        </li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide, maintain, and improve the Service.</li>
        <li>
          Generate personalized study plans and AI coaching recommendations.
        </li>
        <li>Track your progress, streaks, and performance analytics.</li>
        <li>Process payments and manage subscriptions.</li>
        <li>
          Send transactional emails (account verification, password resets,
          subscription confirmations).
        </li>
        <li>
          Send product updates and tips (you can opt out at any time).
        </li>
        <li>Detect and prevent fraud, abuse, and security incidents.</li>
      </ul>

      <h2>3. AI and Data Processing</h2>
      <p>
        We use AI services (including third-party AI providers) to power study
        plan generation, hints, and coaching feedback. When you interact with AI
        features, your prompts and relevant context (such as the current problem
        and your progress data) are sent to our AI providers for processing.
      </p>
      <p>
        We do not sell your data to AI providers. Data sent for AI processing is
        used solely to generate responses for you and is not used to train
        third-party AI models.
      </p>

      <h2>4. How We Share Your Information</h2>
      <p>We do not sell your personal information. We may share data with:</p>
      <ul>
        <li>
          <strong>Service providers:</strong> Stripe (payments), Resend (email),
          Vercel (hosting), Neon (database), and AI providers (Claude, OpenAI) —
          only as needed to operate the Service.
        </li>
        <li>
          <strong>Legal compliance:</strong> When required by law, regulation,
          legal process, or governmental request.
        </li>
        <li>
          <strong>Business transfers:</strong> In connection with a merger,
          acquisition, or sale of assets, your data may be transferred as part
          of that transaction.
        </li>
      </ul>

      <h2>5. Data Retention</h2>
      <p>
        We retain your account data for as long as your account is active. If
        you delete your account, we permanently delete your personal data,
        study plans, progress history, and AI conversation logs within 30 days.
        Some data may be retained in encrypted backups for up to 90 days.
      </p>

      <h2>6. Data Security</h2>
      <p>
        We implement industry-standard security measures to protect your data,
        including:
      </p>
      <ul>
        <li>Passwords are hashed using bcrypt (never stored in plain text).</li>
        <li>All data is transmitted over HTTPS/TLS encryption.</li>
        <li>Database access is restricted and encrypted at rest.</li>
        <li>
          Authentication tokens use secure, httpOnly cookies with short
          expiration times.
        </li>
      </ul>
      <p>
        No method of transmission or storage is 100% secure. While we strive to
        protect your data, we cannot guarantee absolute security.
      </p>

      <h2>7. Your Rights</h2>
      <p>Depending on your jurisdiction, you may have the right to:</p>
      <ul>
        <li>
          <strong>Access</strong> the personal data we hold about you.
        </li>
        <li>
          <strong>Correct</strong> inaccurate or incomplete data.
        </li>
        <li>
          <strong>Delete</strong> your account and associated data (available in
          Settings &gt; Danger Zone).
        </li>
        <li>
          <strong>Export</strong> your data in a portable format.
        </li>
        <li>
          <strong>Object to</strong> or restrict certain processing of your data.
        </li>
      </ul>
      <p>
        To exercise any of these rights, contact us at{" "}
        <a href="mailto:privacy@datainterviewcoach.com" className="text-indigo-400 hover:text-indigo-300">
          privacy@datainterviewcoach.com
        </a>
        .
      </p>

      <h2>8. Cookies</h2>
      <p>
        We use essential cookies for authentication and session management.
        These are strictly necessary for the Service to function and cannot be
        disabled. We do not use third-party tracking cookies or advertising
        cookies.
      </p>

      <h2>9. Children&apos;s Privacy</h2>
      <p>
        The Service is not intended for users under 18 years of age. We do not
        knowingly collect personal information from children. If we learn that
        we have collected data from a child under 18, we will delete that
        information promptly.
      </p>

      <h2>10. International Data Transfers</h2>
      <p>
        Your data may be processed in the United States and other countries
        where our service providers operate. By using the Service, you consent
        to the transfer of your data to these locations.
      </p>

      <h2>11. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you
        of material changes by posting the updated policy on this page and
        updating the &quot;Last updated&quot; date. We encourage you to review this page
        periodically.
      </p>

      <h2>12. Contact Us</h2>
      <p>
        If you have questions or concerns about this Privacy Policy or our data
        practices, contact us at:
      </p>
      <ul>
        <li>
          Email:{" "}
          <a href="mailto:privacy@datainterviewcoach.com" className="text-indigo-400 hover:text-indigo-300">
            privacy@datainterviewcoach.com
          </a>
        </li>
        <li>
          Website:{" "}
          <a href="https://datainterviewcoach.com" className="text-indigo-400 hover:text-indigo-300">
            datainterviewcoach.com
          </a>
        </li>
      </ul>
    </article>
  );
}
