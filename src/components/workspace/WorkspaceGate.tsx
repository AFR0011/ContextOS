"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, LoaderCircle, WifiOff } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { WorkspaceProvider } from "@/lib/client-store";
import {
  listLocalUsers,
  readLocalWorkspace,
  rememberLocalUser,
  type LocalVerifiedUser,
  type StoredLocalUser
} from "@/lib/local-db";
import { LocalRouterProvider } from "@/lib/local-router";
import LocalWorkspaceRouter from "./LocalWorkspaceRouter";
import ReconnectSyncWatchdog from "./ReconnectSyncWatchdog";
import WorkspaceShell from "./WorkspaceShell";

type ReadyGateState = { status: "ready"; user: LocalVerifiedUser; source: "server" | "local" };
type BlockedGateState = { status: "blocked"; title: string; message: string };
type GateState = { status: "checking" } | ReadyGateState | BlockedGateState;
type LocalRecoveryState = ReadyGateState | BlockedGateState;

const AUTH_CHECK_TIMEOUT_MS = 10_000;

async function localUsersWithWorkspaces(): Promise<StoredLocalUser[]> {
  const users = await listLocalUsers();
  const candidates: StoredLocalUser[] = [];
  for (const user of users) {
    const workspace = await readLocalWorkspace(user);
    if (workspace) candidates.push(user);
  }
  return candidates;
}

async function recoverLocalIdentity(): Promise<LocalRecoveryState> {
  const candidates = await localUsersWithWorkspaces();

  if (candidates.length === 1) {
    return { status: "ready", user: candidates[0], source: "local" };
  }

  if (candidates.length === 0) {
    return {
      status: "blocked",
      title: "Connect to open this workspace",
      message: "ContextOS has no previously authenticated local workspace on this device. Connect to the network and sign in once before using it offline."
    };
  }

  return {
    status: "blocked",
    title: "Connect to verify your workspace",
    message: "More than one previously authenticated workspace exists on this device. ContextOS will not guess which identity to open while offline; connect so the active session can be verified."
  };
}

export default function WorkspaceGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/dashboard";
  const [state, setState] = useState<GateState>({ status: "checking" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), AUTH_CHECK_TIMEOUT_MS);

    async function resolveIdentity() {
      setState({ status: "checking" });

      if (!navigator.onLine) {
        const local = await recoverLocalIdentity();
        if (active) setState(local);
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          signal: controller.signal
        });
        const result = (await response.json().catch(() => null)) as { user?: LocalVerifiedUser | null; error?: string } | null;

        if (!response.ok) {
          throw new Error(result?.error || `Could not verify the current session (${response.status}).`);
        }

        if (!result?.user) {
          const current = `${window.location.pathname}${window.location.search}`;
          const next = current.startsWith("/") ? current : "/dashboard";
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }

        await rememberLocalUser(result.user);
        if (active) setState({ status: "ready", user: result.user, source: "server" });
      } catch (reason) {
        const local = await recoverLocalIdentity();
        if (!active) return;

        if (local.status === "ready") {
          setState(local);
          return;
        }

        const detail = reason instanceof DOMException && reason.name === "AbortError"
          ? "Online session verification timed out."
          : reason instanceof Error
            ? reason.message
            : "Online session verification failed.";

        setState({
          status: "blocked",
          title: local.title,
          message: `${detail} ${local.message}`
        });
      }
    }

    void resolveIdentity().catch((reason) => {
      if (!active) return;
      setState({
        status: "blocked",
        title: "Could not open the local workspace",
        message: reason instanceof Error ? reason.message : "ContextOS could not read its local workspace state."
      });
    });

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt, router]);

  if (state.status === "ready") {
    return (
      <WorkspaceProvider user={state.user}>
        <ReconnectSyncWatchdog />
        <LocalRouterProvider initialPathname={pathname}>
          <WorkspaceShell user={state.user}>
            <LocalWorkspaceRouter fallback={children} />
          </WorkspaceShell>
        </LocalRouterProvider>
      </WorkspaceProvider>
    );
  }

  if (state.status === "checking") {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--cos-bg)] p-4 text-[var(--cos-text)]">
        <section data-testid="workspace-gate-checking" className="cos-surface flex w-full max-w-md items-center gap-3 p-5">
          <LoaderCircle className="h-5 w-5 animate-spin text-[var(--cos-primary)]" />
          <div>
            <h1 className="font-semibold text-[var(--cos-text-strong)]">Opening ContextOS</h1>
            <p className="mt-1 text-sm text-[var(--cos-text-muted)]">Checking the active session or an eligible local workspace...</p>
          </div>
        </section>
      </main>
    );
  }

  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--cos-bg)] p-4 text-[var(--cos-text)]">
      <section data-testid="workspace-gate-blocked" className="cos-surface w-full max-w-lg space-y-4 p-6">
        <div className="flex items-start gap-3">
          {offline ? (
            <WifiOff className="mt-0.5 h-6 w-6 text-[var(--cos-warning-text)]" />
          ) : (
            <AlertTriangle className="mt-0.5 h-6 w-6 text-[var(--cos-warning-text)]" />
          )}
          <div>
            <h1 className="text-xl font-semibold text-[var(--cos-text-strong)]">{state.title}</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--cos-text-muted)]">{state.message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="cos-btn cos-btn-primary min-h-10 px-4 py-2 text-sm"
        >
          Retry
        </button>
      </section>
    </main>
  );
}
