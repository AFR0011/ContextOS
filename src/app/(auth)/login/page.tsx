import { redirect } from "next/navigation";
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import { getAuthPageStatus } from "@/lib/auth";
import { DATABASE_UNAVAILABLE_MESSAGE } from "@/lib/database-health";
import { isPublicRegistrationEnabled } from "@/lib/registration";

export default async function LoginPage() {
  const { user, databaseUnavailable } = await getAuthPageStatus();
  if (user) redirect("/dashboard");
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--cos-bg)]" />}>
      <AuthForm
        mode="login"
        serviceStatus={databaseUnavailable ? DATABASE_UNAVAILABLE_MESSAGE : undefined}
        registrationEnabled={isPublicRegistrationEnabled()}
      />
    </Suspense>
  );
}
