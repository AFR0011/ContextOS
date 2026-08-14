import { AccountDeletionPanel } from "@/components/workspace/AccountDeletionPanel";
import { requireUser } from "@/lib/auth";

export default async function AccountDeletePage() {
  const user = await requireUser();
  return <AccountDeletionPanel user={user} />;
}
