import { SearchX } from "lucide-react";

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-bloom border border-pink-100 bg-white p-8 text-center">
      <SearchX className="mx-auto text-blossom" size={36} />
      <h2 className="mt-3 text-lg font-bold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-zinc-600">{message}</p>
    </div>
  );
}
