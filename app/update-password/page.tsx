import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/update-password-form";
export const metadata: Metadata = {
  title: "Nueva contraseña · Arcade Vault",
};
export default function UpdatePasswordPage() {
  return <UpdatePasswordForm />;
}
