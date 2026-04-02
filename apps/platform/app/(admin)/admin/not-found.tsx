import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold text-gray-800">Page Not Found</h2>
      <p className="text-gray-500">The admin page you're looking for doesn't exist.</p>
      <Link
        href="/admin"
        className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
