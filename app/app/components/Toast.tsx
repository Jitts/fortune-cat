export default function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-neutral-900 px-4 py-3 text-sm text-white shadow-lg">
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-3 text-neutral-400 hover:text-white">
        ✕
      </button>
    </div>
  );
}
