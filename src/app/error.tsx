"use client";

import { Button } from "@/components/ui/button";

// ponytail: validation (Zod) errors land here; switch to per-field useActionState if it gets annoying.
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-4 py-12 text-center">
      <p className="text-sm text-destructive">{error.message}</p>
      <Button variant="secondary" onClick={reset}>Try again</Button>
    </div>
  );
}
