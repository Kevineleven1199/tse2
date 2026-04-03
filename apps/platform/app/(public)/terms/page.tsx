import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Tri State Enterprise",
  description:
    "Terms and conditions for using Tri State Enterprise services and platform. Covers booking, cancellation, payments, and more.",
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

export default function TermsOfServicePage() {
  return (
    <main className="bg-white">
      <div className="bg-gradient-to-b from-green-50 to-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-base text-gray-500">
            Last updated: March 17, 2026
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-10 px-4 pb-20 pt-8 text-base leading-relaxed text-gray-700 sm:px-6">
        <p>
          Welcome to Tri State Enterprise. These Terms of Service
          (&quot;Terms&quot;) govern your use of our website, platform, and
          cleaning services. By booking a service or creating an account, you
          agree to these Terms. If you do not agree, please do not use our
          services.
        </p>

        <Section title="1. About Our Services">
          <p>
            Tri State Enterprise provides professional organic cleaning
            services in the Flatwoods, Kentucky area. We use EPA Safer Choice and
            plant-based cleaning products that are safe for children, pets, and
            the environment. Our services include residential cleaning,
            commercial cleaning, deep cleaning, and move-in/move-out cleaning.
          </p>
        </Section>

        <Section title="2. User Accounts">
          <p>
            You may create an account to manage bookings, view invoices, and
            communicate with our team. You are responsible for:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Providing accurate and up-to-date information</li>
            <li>Maintaining the confidentiality of your login credentials</li>
            <li>All activity that occurs under your account</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate
            these Terms or engage in fraudulent activity.
          </p>
        </Section>

        <Section title="3. Booking and Scheduling">
          <p>
            When you book a cleaning service through our platform, you are
            entering into an agreement for us to provide the selected service at
            the agreed-upon date, time, and location. Booking confirmations will
            be sent via email and/or SMS.
          </p>
          <p>
            We make every effort to arrive within the scheduled time window.
            However, arrival times may vary due to traffic, weather, or
            preceding appointments. We will notify you promptly of any
            significant delays.
          </p>
        </Section>

        <Section title="4. Cancellation and Rescheduling">
          <p>
            We understand plans change. Our cancellation policy is as follows:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>24+ hours notice:</strong> cancel or reschedule at no
              charge
            </li>
            <li>
              <strong>Less than 24 hours notice:</strong> a cancellation fee of
              up to 50% of the scheduled service cost may apply
            </li>
            <li>
              <strong>No-show or locked-out arrival:</strong> the full service
              amount may be charged if our team arrives and cannot access the
              property
            </li>
          </ul>
          <p>
            To cancel or reschedule, contact us at{" "}
            <a
              href="mailto:hello@tsenow.com"
              className="text-green-700 underline hover:text-green-900"
            >
              hello@tsenow.com
            </a>{" "}
            or call{" "}
            <a
              href="tel:+16068362534"
              className="text-green-700 underline hover:text-green-900"
            >
              (606) 836-2534
            </a>
            .
          </p>
        </Section>

        <Section title="5. Pricing and Payment">
          <p>
            Service prices are provided as quotes based on the size and
            condition of your space, cleaning type, and any special requests. All
            quotes are valid for 30 days from the date issued.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Payments are processed securely through <strong>Stripe</strong>.
              We accept major credit and debit cards.
            </li>
            <li>
              Payment is due at the time of booking or upon service completion,
              as specified in your quote.
            </li>
            <li>
              Recurring cleaning plans are billed automatically on the agreed
              schedule. You may cancel a recurring plan at any time with 24
              hours notice before the next scheduled cleaning.
            </li>
            <li>
              Tips are appreciated but never required. 100% of tips go directly
              to your cleaning team.
            </li>
          </ul>
        </Section>

        <Section title="6. Satisfaction Guarantee">
          <p>
            We stand behind our work. If you are not satisfied with any aspect of
            your cleaning, contact us within 24 hours and we will re-clean the
            area in question at no additional cost. The satisfaction guarantee
            does not cover requests for services not included in the original
            booking.
          </p>
        </Section>

        <Section title="7. Access to Your Property">
          <p>
            You agree to provide safe and reasonable access to the areas to be
            cleaned. This includes:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Securing pets in a safe area during the cleaning</li>
            <li>
              Removing or securing valuables, fragile items, and personal
              documents
            </li>
            <li>
              Providing working utilities (water, electricity) necessary for
              cleaning
            </li>
            <li>
              Informing us of any hazards, access codes, or special instructions
              in advance
            </li>
          </ul>
        </Section>

        <Section title="8. Liability and Damages">
          <p>
            Tri State Enterprise carries general liability insurance. In the
            unlikely event of accidental damage during a cleaning:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Report any damage within 24 hours of the service for us to
              investigate
            </li>
            <li>
              We will repair or reimburse the fair market value of damaged items,
              subject to verification
            </li>
            <li>
              We are not liable for damage caused by pre-existing conditions,
              normal wear and tear, or items not disclosed prior to service
            </li>
          </ul>
          <p>
            <strong>Limitation of liability:</strong> To the maximum extent
            permitted by law, Tri State Enterprise&apos;s total liability for
            any claim arising from our services shall not exceed the amount paid
            for the specific service giving rise to the claim.
          </p>
        </Section>

        <Section title="9. Referral Program">
          <p>
            We may offer a referral program that rewards customers for referring
            new clients. Referral credits or payouts are subject to the specific
            terms of the program at the time of referral. We reserve the right
            to modify or discontinue the referral program at any time.
          </p>
        </Section>

        <Section title="10. Intellectual Property">
          <p>
            All content on the Tri State Enterprise website and platform,
            including logos, text, images, and software, is our property or
            licensed to us and is protected by copyright and trademark laws. You
            may not reproduce, distribute, or create derivative works without
            our written permission.
          </p>
        </Section>

        <Section title="11. Prohibited Conduct">
          <p>When using our platform, you agree not to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Provide false or misleading information in bookings or account
              details
            </li>
            <li>
              Attempt to directly hire or solicit our cleaning team members
              outside the platform
            </li>
            <li>
              Use the platform for any unlawful purpose or in violation of these
              Terms
            </li>
            <li>
              Interfere with or disrupt the platform&apos;s operation or
              security
            </li>
          </ul>
        </Section>

        <Section title="12. Governing Law">
          <p>
            These Terms are governed by the laws of the State of Kentucky. Any
            disputes arising from these Terms or our services shall be resolved
            in the courts of Flatwoods County, Kentucky. Before filing a legal
            claim, both parties agree to attempt to resolve disputes informally
            by contacting us at{" "}
            <a
              href="mailto:hello@tsenow.com"
              className="text-green-700 underline hover:text-green-900"
            >
              hello@tsenow.com
            </a>
            .
          </p>
        </Section>

        <Section title="13. Changes to These Terms">
          <p>
            We may update these Terms from time to time. Changes will be posted
            on this page with an updated &quot;Last updated&quot; date.
            Continued use of our services after changes are posted constitutes
            acceptance of the revised Terms. For material changes, we will make
            reasonable efforts to notify you by email.
          </p>
        </Section>

        <Section title="14. Contact Us">
          <p>
            If you have questions about these Terms, please reach out:
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
