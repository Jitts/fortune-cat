export default function Loading() {
  return (
    <main className="min-h-screen bg-neutral-50 p-6 sm:p-10">
      <div className="mx-auto max-w-3xl animate-pulse space-y-6">
        <div className="h-8 w-40 rounded bg-neutral-200" />
        <div className="h-28 rounded-2xl bg-neutral-200" />
        <div className="h-40 rounded-2xl bg-neutral-200" />
        <div className="h-64 rounded-2xl bg-neutral-200" />
      </div>
    </main>
  );
}
