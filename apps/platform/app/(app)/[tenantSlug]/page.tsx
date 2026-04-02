import { redirect } from "next/navigation";
import { resolveTenantSlug, type TenantRouteParams } from "@/src/lib/tenant";

type TenantRootPageProps = {
  params: Promise<TenantRouteParams>;
};

const TenantRootPage = async ({ params }: TenantRootPageProps) => {
  const tenantSlug = await resolveTenantSlug(params);
  redirect(`/${tenantSlug}/dashboard`);
};

export default TenantRootPage;
