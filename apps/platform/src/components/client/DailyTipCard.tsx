import { Card, CardContent } from "@/src/components/ui/card";

type DailyTipCardProps = {
  subject: string;
  preview: string;
};

export const DailyTipCard = ({ subject, preview }: DailyTipCardProps) => {
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <Card className="overflow-hidden border-brand-200 bg-gradient-to-br from-brand-50 to-white">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-2xl text-white shadow-md">
            🌿
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-500">
              Daily Green Tip — {today}
            </p>
            <p className="mt-1 text-base font-semibold text-accent leading-snug">
              {subject}
            </p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {preview}
            </p>
          </div>
          <a
            href="/api/newsletter/daily-tip"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 rounded-full border border-brand-200 bg-white px-4 py-2 text-xs font-semibold text-accent transition hover:bg-brand-50 hover:shadow-sm"
          >
            Read More
          </a>
        </div>
      </CardContent>
    </Card>
  );
};
