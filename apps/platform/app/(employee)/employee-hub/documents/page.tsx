import { requireSession } from "@/src/lib/auth/session";
import { FileText, Download, Shield, Briefcase, ClipboardCheck, ScrollText } from "lucide-react";

export const dynamic = "force-dynamic";

const documents = [
  {
    title: "1099 Independent Contractor Agreement",
    description: "Your services agreement with Tri State Enterprise. Outlines compensation, responsibilities, and terms of engagement.",
    href: "/api/documents/contractor-agreement",
    icon: Briefcase,
    category: "Agreement",
    required: true,
  },
  {
    title: "Drug-Free Workplace Policy",
    description: "Our commitment to a safe, drug-free work environment. Required reading and acknowledgment for all team members.",
    href: "/api/documents/drug-free-policy",
    icon: Shield,
    category: "Policy",
    required: true,
  },
  {
    title: "Latest Paystub",
    description: "Download your most recent earnings statement with hours, pay rate, and payment details.",
    href: "/employee-hub/paystubs",
    icon: FileText,
    category: "Pay",
    isLink: true,
  },
];

export default async function DocumentsPage() {
  const session = await requireSession({
    roles: ["CLEANER", "HQ", "MANAGER"],
    redirectTo: "/employee-hub",
  });

  const isAdmin = session.role === "HQ" || session.role === "MANAGER";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-accent">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? "Manage and distribute documents for the team."
            : "Access your agreements, policies, and pay documents."}
        </p>
      </div>

      {/* Required Documents */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-accent">Required Documents</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {documents
            .filter((d) => d.required)
            .map((doc) => {
              const Icon = doc.icon;
              return (
                <div
                  key={doc.title}
                  className="group rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-accent">{doc.title}</h3>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Required</span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{doc.description}</p>
                      <div className="mt-4 flex gap-3">
                        <a
                          href={doc.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-brand-700"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View PDF
                        </a>
                        <a
                          href={doc.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-accent transition hover:bg-brand-50"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Pay Documents */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-accent">Pay Documents</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {documents
            .filter((d) => !d.required)
            .map((doc) => {
              const Icon = doc.icon;
              return (
                <div
                  key={doc.title}
                  className="group rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-accent">{doc.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{doc.description}</p>
                      <div className="mt-4">
                        <a
                          href={doc.href}
                          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-brand-700"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {doc.isLink ? "View All" : "View PDF"}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Tax Info Notice */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-900">1099 Tax Information</h3>
            <p className="mt-1 text-sm text-amber-800">
              As an independent contractor, you are responsible for your own tax filings.
              You will receive a 1099-NEC form for annual earnings of $600 or more.
              We recommend consulting with a tax professional for guidance on estimated quarterly payments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
