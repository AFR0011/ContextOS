import WorkspaceGate from "@/components/workspace/WorkspaceGate";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceGate>{children}</WorkspaceGate>;
}
