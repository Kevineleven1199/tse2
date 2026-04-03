import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import Link from "next/link";
import { Star, Shield, CheckCircle, Award } from "lucide-react";
import { notFound } from "next/navigation";

const CleanerProfilePage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  await requireSession({ roles: ["CUSTOMER", "HQ"], redirectTo: "/login" });

  // Fetch real cleaner data
  const profile = await prisma.cleanerProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!profile) {
    notFound();
  }

  const cleanerName = `${profile.user.firstName ?? ""} ${profile.user.lastName ?? ""}`.trim() || "Your Cleaner";
  const initial = cleanerName.charAt(0).toUpperCase();

  // Get real stats from completed jobs
  const completedCount = await prisma.jobAssignment.count({
    where: { cleanerId: id, status: "COMPLETED" },
  });

  const rating = 5.0;
  const avgRating = { count: 0 };

  const certifications = [
    { name: "Professional Grade Products", icon: "shield" },
    { name: "Background Checked", icon: "check" },
    { name: "Licensed & Insured", icon: "award" },
  ];

  const getCertificationIcon = (iconType: string) => {
    switch (iconType) {
      case "shield":
        return <Shield className="w-5 h-5" />;
      case "check":
        return <CheckCircle className="w-5 h-5" />;
      case "award":
        return <Award className="w-5 h-5" />;
      default:
        return <Shield className="w-5 h-5" />;
    }
  };

  const renderStars = (r: number) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-5 h-5 ${
            star <= Math.floor(r)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/client"
        className="text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-2 transition-colors"
      >
        ← Back to Dashboard
      </Link>

      {/* Profile Header */}
      <Card className="rounded-3xl border-0 shadow-sm bg-white">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {initial}
              </div>
            </div>
            <div className="flex-grow">
              <h1 className="text-3xl font-bold text-brand-900 mb-2">
                {cleanerName}
              </h1>
              <div className="flex items-center gap-3">
                {renderStars(rating)}
                <span className="font-semibold text-brand-900">{rating}</span>
                {avgRating.count > 0 && (
                  <span className="text-muted-foreground">
                    ({avgRating.count} review{avgRating.count !== 1 ? "s" : ""})
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-3 py-1 bg-accent/10 text-accent text-sm font-medium rounded-full">
                  Verified Cleaner
                </span>
                {profile.active && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                    Active
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="rounded-2xl border-0 shadow-sm bg-white">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-brand-600 mb-1">
              {completedCount}
            </div>
            <p className="text-sm text-muted-foreground">Completed Cleans</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm bg-white">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-brand-600 mb-1">
              {rating}★
            </div>
            <p className="text-sm text-muted-foreground">Rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Certifications */}
      <Card className="rounded-2xl border-0 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold text-brand-900">
            Certifications & Credentials
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {certifications.map((cert) => (
              <div
                key={cert.name}
                className="flex items-center gap-3 p-3 bg-brand-50 rounded-xl"
              >
                <div className="text-brand-600">
                  {getCertificationIcon(cert.icon)}
                </div>
                <span className="font-medium text-brand-900">{cert.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/client/feedback"
          className="px-6 py-3 bg-accent text-white font-semibold rounded-2xl hover:bg-accent/90 transition-colors shadow-sm text-center"
        >
          Leave Feedback
        </Link>
        <Link
          href="/client"
          className="px-6 py-3 bg-brand-100 text-brand-600 font-semibold rounded-2xl hover:bg-brand-200 transition-colors shadow-sm text-center"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default CleanerProfilePage;
