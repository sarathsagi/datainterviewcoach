import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Data Interview Coach",
  description: "Terms of Service for Data Interview Coach",
};

export default function TermsOfServicePage() {
  return (
    <article className="prose prose-invert prose-slate max-w-none">
      <h1>Terms of Service</h1>
      <p className="text-slate-400 text-sm">Last updated: April 15, 2026</p>

      <p>
        Welcome to Data Interview Coach (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By
        accessing or using our website at{" "}
        <strong>datainterviewcoach.com</strong> (the &quot;Service&quot;), you agree to
        be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree,
        please do not use the Service.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least 18 years old to use this Service. By creating an
        account, you represent that you meet this requirement and that the
        information you provide is accurate and complete.
      </p>

      <h2>2. Account Registration</h2>
      <p>
        To access certain features, you must create an account. You are
        responsible for maintaining the confidentiality of your credentials and
        for all activity under your account. You agree to notify us immediately
        of any unauthorized use.
      </p>

      <h2>3. Subscriptions and Payments</h2>
      <ul>
        <li>
          Some features require a paid subscription. Pricing and plan details
          are displayed at the time of purchase.
        </li>
        <li>
          Subscriptions renew automatically at the end of each billing period
          unless cancelled before the renewal date.
        </li>
        <li>
          Payments are processed securely through Stripe. We do not store your
          payment card details on our servers.
        </li>
        <li>
          You may cancel your subscription at any time through your account
          settings. Cancellation takes effect at the end of the current billing
          period. No prorated refunds are provided for partial billing periods.
        </li>
      </ul>

      <h2>4. Free Trial</h2>
      <p>
        We may offer a free trial period. If you do not cancel before the trial
        ends, your subscription will convert to a paid plan and you will be
        charged the applicable fee.
      </p>

      <h2>5. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          Use the Service for any unlawful purpose or in violation of any
          applicable law or regulation.
        </li>
        <li>
          Attempt to reverse-engineer, decompile, or extract source code from
          the Service.
        </li>
        <li>
          Scrape, crawl, or use automated tools to access content in bulk.
        </li>
        <li>
          Share your account credentials or allow others to access your account.
        </li>
        <li>
          Redistribute, resell, or publicly share practice problems, AI-generated
          content, or study plans from the Service.
        </li>
      </ul>

      <h2>6. AI-Generated Content</h2>
      <p>
        The Service uses artificial intelligence to generate study plans, hints,
        coaching feedback, and other content. While we strive for accuracy,
        AI-generated content is provided &quot;as is&quot; and may contain errors. It
        should not be treated as professional advice. You are responsible for
        verifying any information before relying on it.
      </p>

      <h2>7. Intellectual Property</h2>
      <p>
        All content, design, code, and branding on the Service are owned by
        Data Interview Coach or its licensors and are protected by intellectual
        property laws. Your subscription grants you a personal, non-transferable,
        non-exclusive license to use the Service for your own interview
        preparation.
      </p>

      <h2>8. User Content</h2>
      <p>
        You retain ownership of any content you submit (e.g., code solutions,
        notes). By submitting content, you grant us a limited license to store,
        process, and display it as necessary to provide the Service.
      </p>

      <h2>9. Termination</h2>
      <p>
        We may suspend or terminate your account if you violate these Terms or
        engage in conduct that we determine is harmful to the Service or other
        users. You may delete your account at any time through the Settings page.
        Upon deletion, your data will be permanently removed in accordance with
        our Privacy Policy.
      </p>

      <h2>10. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES
        OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT GUARANTEE THAT USING THE
        SERVICE WILL RESULT IN ANY PARTICULAR INTERVIEW OUTCOME, JOB OFFER, OR
        CAREER ADVANCEMENT.
      </p>

      <h2>11. Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, DATA INTERVIEW COACH SHALL NOT
        BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
        PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL
        LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS
        PRECEDING THE CLAIM.
      </p>

      <h2>12. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. We will notify you of
        material changes by posting the updated Terms on this page and updating
        the &quot;Last updated&quot; date. Your continued use of the Service after
        changes are posted constitutes acceptance of the revised Terms.
      </p>

      <h2>13. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware, United
        States, without regard to conflict of law principles.
      </p>

      <h2>14. Contact</h2>
      <p>
        If you have questions about these Terms, please contact us at{" "}
        <a href="mailto:support@datainterviewcoach.com" className="text-indigo-400 hover:text-indigo-300">
          support@datainterviewcoach.com
        </a>
        .
      </p>
    </article>
  );
}
