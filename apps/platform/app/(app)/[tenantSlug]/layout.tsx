import { ReactNode } from "react";
import { notFound } from "next/navigation";
import DashboardNav from "@/components/dashboard/nav";
import { resolveTenantSlug, type TenantPageProps } from "@/src/lib/tenant";
import { prisma } from "@/lib/prisma";

type TenantLayoutProps = TenantPageProps & {
  children: ReactNode;
};

const TenantLayout = async ({ children, params }: TenantLayoutProps) => {
  const tenantSlug = await resolveTenantSlug(params);

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true }
  });

  if (!tenant) {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-8 lg:px-6">
      <DashboardNav tenantSlug={tenantSlug} />
      <main className="flex-1 space-y-6 text-white">{children}</main>
    </div>
  );
};

export default TenantLayout;
