export type TenantRouteParams = {
  tenantSlug: string;
};

type Awaitable<T> = T | Promise<T>;

export type TenantPageProps = {
  params: Promise<TenantRouteParams>;
};

type TenantParamsInput = Awaitable<TenantRouteParams>;

export const resolveTenantParams = async (
  params: TenantParamsInput
): Promise<TenantRouteParams> => {
  if (typeof (params as TenantRouteParams).tenantSlug === "string") {
    return params as TenantRouteParams;
  }

  return await params;
};

export const resolveTenantSlug = async (
  params: TenantParamsInput
): Promise<string> => {
  const { tenantSlug } = await resolveTenantParams(params);
  return tenantSlug;
};
