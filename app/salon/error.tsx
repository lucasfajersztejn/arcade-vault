"use client";
import { LoadError } from "@/components/load-error";
export default function SalonError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <LoadError what="el Salón de la Fama" error={error} retry={retry} />;
}
