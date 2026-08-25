import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-semibold tracking-tight">404</p>
      <h1 className="text-xl font-medium">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you are looking for doesn&apos;t exist or may have moved.
      </p>
      <Button asChild className="mt-2 rounded-xl">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
