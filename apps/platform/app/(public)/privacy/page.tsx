import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Tri State Enterprise",
  description:
    "Learn how Tri State Enterprise collects, uses, and protects your personal information. Flatwoods-based organic cleaning services committed to your privacy.",
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="space-y-3">
    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
    {children}
  </section>
);

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-white">
      <div className="bg-gradient-to-b from-green-50 to-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-base text-gray-500">
            Last updated: March 17, 2026
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-10 px-4 pb-20 pt-8 text-base leading-relaxed text-gray-700 sm:px-6">
        <p>
          Tri State Enterprise (&quot;we,&quot; &quot;us,&quot; or
          &quot;our&quot;) operates the TriState platform and provides organic
          cleaning services in the Flatwoods, Kentucky area. This Privacy Policy
          explains how we collect, use, disclose, and safeguard your information
          when you visit our website, book a cleaning service, or interact with
          our platform.
        </p>

        <Section title="1. Information We Collect">
          <p>We may collect the following types of personal information:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Contact information:</strong> name, email address, phone
              number, and physical address
            </li>
            <li>
              <strong>Account credentials:</strong> email and password when you
              create a user account
            </li>
            <li>
              <strong>Payment information:</strong> credit card and billing
              details processed securely through Stripe (we do not store your
              full card number)
            </li>
            <li>
              <strong>Service preferences:</strong> cleaning frequency, special
              instructions, home access details, and scheduling preferences
            </li>
            <li>
              <strong>Communications:</strong> messages sent through our
              platform, SMS communications, and call transcripts
            </li>
            <li>
              <strong>Device and usage data:</strong> IP address, browser type,
              pages visited, and cookies (see Section 6)
            </li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Schedule and deliver cleaning services at your location</li>
            <li>Process payments and send invoices or receipts</li>
            <li>
              Communicate with you about bookings, reminders, and service
              updates via email and SMS
            </li>
            <li>Improve our services and customer experience</li>
            <li>
              Send promotional offers or newsletters (only with your consent;
              you can opt out at any time)
            </li>
            <li>
              Generate AI-powered service estimates and call summaries to improve
              response times
            </li>
            <li>Comply with legal obligations and resolve disputes</li>
          </ul>
        </Section>

        <Section title="3. Third-Party Service Providers">
          <p>
            We share your data only with trusted service providers who help us
            operate the platform:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Stripe</strong> &mdash; secure payment processing. Stripe
              handles your card data under its own{" "}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 underline hover:text-green-900"
              >
                Privacy Policy
              </a>
              .
            </li>
            <li>
              <strong>SendGrid</strong> &mdash; transactional and marketing
              emails
            </li>
            <li>
              <strong>OpenPhone</strong> &mdash; SMS messaging and phone
              communications
            </li>
            <li>
              <strong>OpenAI</strong> &mdash; AI-powered service estimates and
              call summaries (no personally identifiable information is used for
              model training)
            </li>
            <li>
              <strong>Google Calendar</strong> &mdash; scheduling integration
            </li>
          </ul>
          <p>
            We do not sell, rent, or trade your personal information to third
            parties for their marketing purposes.
          </p>
        </Section>

        <Section title="4. Data Storage and Security">
          <p>
            Your data is stored on secure, encrypted servers. We use
            industry-standard security measures including HTTPS encryption,
            secure authentication tokens, and access controls to protect your
            information. Payment data is handled exclusively by Stripe and never
            stored on our servers.
          </p>
          <p>
            While we strive to protect your personal information, no method of
            transmission over the internet is 100% secure. We cannot guarantee
            absolute security but will notify you promptly in the event of a
            data breach.
          </p>
        </Section>

        <Section title="5. Data Retention">
          <p>
            We retain your personal information for as long as your account is
            active or as needed to provide you services. If you request account
            deletion, we will remove your data within 30 days, except where
            retention is required by law (e.g., financial records for tax
            purposes).
          </p>
        </Section>

        <Section title="6. Cookies and Tracking">
          <p>
            Our website uses cookies and similar technologies to maintain your
            session, remember preferences, and analyze site traffic. You can
            control cookie settings through your browser. Disabling cookies may
            affect certain features of the platform.
          </p>
          <p>We use the following types of cookies:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Essential cookies:</strong> required for login and core
              functionality
            </li>
            <li>
              <strong>Analytics cookies:</strong> help us understand how visitors
              use our site
            </li>
          </ul>
        </Section>

        <Section title="7. Your Rights">
          <p>You have the right to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Access</strong> the personal data we hold about you
            </li>
            <li>
              <strong>Correct</strong> inaccurate or incomplete information
            </li>
            <li>
              <strong>Delete</strong> your account and associated data
            </li>
            <li>
              <strong>Opt out</strong> of marketing communications at any time
            </li>
            <li>
              <strong>Request a copy</strong> of your data in a portable format
            </li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a
              href="mailto:hello@tsenow.com"
              className="text-green-700 underline hover:text-green-900"
            >
              hello@tsenow.com
            </a>
            . We will respond within 30 days.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>
            Our services are not directed to individuals under the age of 18. We
            do not knowingly collect personal information from children. If you
            believe a child has provided us personal data, please contact us and
            we will delete it promptly.
          </p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. Changes will be
            posted on this page with an updated &quot;Last updated&quot; date.
            We encourage you to review this page periodically. Continued use of
            our services after changes constitutes acceptance of the updated
            policy.
          </p>
        </Section>

        <Section title="10. Contact Us">
          <p>
            If you have questions or concerns about this Privacy Policy, please
            contact us:
          </p>
          <div className="rounded-lg border border-green-100 bg-green-50 p-5">
            <p className="font-semibold text-gray-900">
              Tri State Enterprise
            </p>
            <p>Flatwoods, Kentucky</p>
            <p>
              Email:{" "}
              <a
                href="mailto:hello@tsenow.com"
                className="text-green-700 underline hover:text-green-900"
              >
                hello@tsenow.com
              </a>
            </p>
            <p>
              Phone:{" "}
              <a
                href="tel:+16068362534"
                className="text-green-700 underline hover:text-green-900"
              >
                (606) 836-2534
              </a>
            </p>
          </div>
        </Section>
      </div>
    </main>
  );
}
