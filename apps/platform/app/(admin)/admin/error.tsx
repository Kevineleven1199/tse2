"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <div className="rounded-lg bg-red-50 border border-red-200 p-6 max-w-md text-center">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
        <p className="text-sm text-red-600 mb-4">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
