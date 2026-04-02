import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

const Loading = () => {
  return (
    <div className="section-wrapper py-12">
      <Card className="bg-white">
        <CardHeader>
          <div className="h-6 w-40 animate-pulse rounded-full bg-brand-100" />
          <div className="h-4 w-72 animate-pulse rounded-full bg-brand-50" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded-full bg-brand-50" />
            <div className="h-4 w-5/6 animate-pulse rounded-full bg-brand-50" />
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-brand-50" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Loading;
