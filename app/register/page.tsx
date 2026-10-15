import type { Metadata } from "next";
import { RegisterForm } from "@/components/register-form";
export const metadata: Metadata = {
  title: "Crear cuenta · Arcade Vault",
};
export default function RegisterPage() {
  return <RegisterForm />;
}
