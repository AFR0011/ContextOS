import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getAuthPageStatus } from "@/lib/auth";
import { DATABASE_UNAVAILABLE_MESSAGE } from "@/lib/database-health";

export default async function LoginPage() {
  const { user, databaseUnavailable } = await getAuthPageStatus();
  if (user) redirect("/dashboard");
  return <AuthForm mode="login" serviceStatus={databaseUnavailable ? DATABASE_UNAVAILABLE_MESSAGE : undefined} />;
}
