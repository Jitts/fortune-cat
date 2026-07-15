export default function Loading() {
  return (
    <main className="min-h-screen bg-surface-2 p-6 sm:p-10">
      <div className="mx-auto max-w-3xl animate-pulse space-y-6">
        <div className="h-8 w-40 rounded bg-surface-3" />
        <div className="h-28 rounded-2xl bg-surface-3" />
        <div className="h-40 rounded-2xl bg-surface-3" />
        <div className="h-64 rounded-2xl bg-surface-3" />
      </div>
    </main>
  );
}
