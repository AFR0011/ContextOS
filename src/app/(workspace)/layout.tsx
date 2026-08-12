import { requireUser } from "@/lib/auth";
import { WorkspaceProvider } from "@/lib/client-store";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <WorkspaceProvider user={user}>
      <WorkspaceShell user={user}>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}
