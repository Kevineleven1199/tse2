export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-100 rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-gray-100 rounded-lg" />
    </div>
  );
}
