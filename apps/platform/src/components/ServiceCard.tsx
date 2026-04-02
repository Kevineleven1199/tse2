import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { fadeUp } from "@/src/lib/animations";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

type ServiceCardProps = {
  title: string;
  description: string;
  highlights: string[];
  icon: LucideIcon;
  image?: string;
};

export const ServiceCard = ({ title, description, highlights, icon: Icon, image }: ServiceCardProps) => (
  <motion.div variants={fadeUp}>
    <Card className="flex h-full flex-col justify-between bg-white overflow-hidden">
      {/* Service Image */}
      {image && (
        <div className="relative h-48 w-full overflow-hidden rounded-t-3xl">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
        </div>
      )}
      <CardHeader className="flex flex-col gap-4 pb-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-accent shadow-sm shadow-brand-100/50">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-display text-xl font-semibold leading-tight text-accent">{title}</h3>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ul className="space-y-3 text-sm text-muted-foreground">
          {highlights.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/get-a-quote"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-accent px-7 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
        >
          Get a Quote
        </Link>
      </CardContent>
    </Card>
  </motion.div>
);
