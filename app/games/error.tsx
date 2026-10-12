"use client";
import { LoadError } from "@/components/load-error";
export default function GamesError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <LoadError what="los juegos" error={error} retry={retry} />;
}
