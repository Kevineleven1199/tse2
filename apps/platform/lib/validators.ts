import { z } from "zod";

const SERVICE_TYPE_MAP: Record<string, string> = {
  home_clean: "HOME_CLEAN",
  pressure_wash: "PRESSURE_WASH",
  auto_detail: "AUTO_DETAIL",
  custom: "CUSTOM"
} as const;

export const serviceRequestSchema = z.object({
  tenantSlug: z.string().min(2),
  serviceType: z
    .enum(["home_clean", "pressure_wash", "auto_detail", "custom"])
    .transform((val) => SERVICE_TYPE_MAP[val] as "HOME_CLEAN" | "PRESSURE_WASH" | "AUTO_DETAIL" | "CUSTOM"),
  squareFootage: z.number().min(200).max(8000).optional(),
  location: z.object({
    addressLine1: z.string().min(3),
    addressLine2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().length(2),
    postalCode: z.string().min(5),
    lat: z.number().optional(),
    lng: z.number().optional()
  }),
  contact: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(10)
  }),
  preferredWindows: z
    .array(
      z.object({
        start: z.string(),
        end: z.string()
      })
    )
    .min(1),
  surfaces: z.array(z.string()).min(1),
  notes: z.string().optional()
});

/** The form/input type with lowercase service types (what the client sends) */
export type ServiceRequestInput = z.input<typeof serviceRequestSchema>;

/** The parsed/output type with uppercase service types (after Zod transform) */
export type ServiceRequestPayload = z.output<typeof serviceRequestSchema>;
