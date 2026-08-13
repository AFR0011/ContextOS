"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, ShieldAlert } from "lucide-react";

type ShellStatus = {
  ready: boolean;
  version?: string;
  missing?: string[];
};

type ReadinessState =
  | { status: "checking"; version?: string }
  | { status: "ready"; version?: string }
  | { status: "incomplete"; version?: string; missing: number }
  | { status: "unsupported" };

const MESSAGE_TIMEOUT_MS = 8_000;

function askWorker(worker: ServiceWorker, type: "CONTEXTOS_SHELL_STATUS" | "CONTEXTOS_SHELL_PRIME") {
  return new Promise<ShellStatus>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => {
      channel.port1.close();
      reject(new Error("Offline shell status timed out."));
    }, MESSAGE_TIMEOUT_MS);

    channel.port1.onmessage = (event: MessageEvent<ShellStatus>) => {
      window.clearTimeout(timeout);
      channel.port1.close();
      resolve(event.data);
    };

    worker.postMessage({ type }, [channel.port2]);
  });
}

function workerFor(registration: ServiceWorkerRegistration) {
  return registration.active ?? navigator.serviceWorker.controller ?? registration.waiting ?? registration.installing;
}

export function OfflineReadiness() {
  const [state, setState] = useState<ReadinessState>({ status: "checking" });
  const latestCheck = useRef(0);

  const check = useCallback(async (allowPrime: boolean) => {
    const attempt = ++latestCheck.current;
    const isCurrent = () => latestCheck.current === attempt;

    if (!("serviceWorker" in navigator)) {
      if (isCurrent()) setState({ status: "unsupported" });
      return;
    }

    if (isCurrent()) {
      setState((current) => ({ status: "checking", version: "version" in current ? current.version : undefined }));
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      const readyRegistration = await navigator.serviceWorker.ready;
      const worker = workerFor(registration) ?? workerFor(readyRegistration);
      if (!worker) {
        if (isCurrent()) setState({ status: "incomplete", missing: 1 });
        return;
      }

      let status = await askWorker(worker, "CONTEXTOS_SHELL_STATUS");
      if (!status.ready && allowPrime && navigator.onLine) {
        status = await askWorker(worker, "CONTEXTOS_SHELL_PRIME");
      }

      if (!isCurrent()) return;
      if (status.ready) {
        setState({ status: "ready", version: status.version });
        return;
      }

      setState({ status: "incomplete", version: status.version, missing: status.missing?.length ?? 1 });
    } catch {
      if (isCurrent()) setState({ status: "incomplete", missing: 1 });
    }
  }, []);

  useEffect(() => {
    void check(true);

    // A newly activated worker can replace an older controller while a status request
    // to that older worker is still timing out. Each controller change starts a newer
    // check; the sequence guard prevents the stale request from overwriting the result.
    const handleControllerChange = () => void check(true);
    const handleOnline = () => void check(true);
    const handleOffline = () => void check(false);

    navigator.serviceWorker?.addEventListener("controllerchange", handleControllerChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      latestCheck.current += 1;
      navigator.serviceWorker?.removeEventListener("controllerchange", handleControllerChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [check]);

  if (state.status === "ready") {
    return (
      <div
        data-testid="offline-shell-readiness"
        data-ready="true"
        title={state.version ? `Cached application shell ${state.version}` : "Cached application shell is complete"}
        className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--cos-success-border)] bg-[var(--cos-success-soft)] px-3 py-2 text-xs font-semibold text-[var(--cos-success-text)]"
      >
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>Offline ready</span>
        {state.version ? <span className="ml-auto font-normal opacity-75">{state.version}</span> : null}
      </div>
    );
  }

  if (state.status === "checking") {
    return (
      <div
        data-testid="offline-shell-readiness"
        data-ready="false"
        className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--cos-border)] bg-[var(--cos-bg-soft)] px-3 py-2 text-xs font-semibold text-[var(--cos-text-muted)]"
      >
        <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin" />
        <span>Preparing offline shell</span>
      </div>
    );
  }

  return (
    <div
      data-testid="offline-shell-readiness"
      data-ready="false"
      title={state.status === "incomplete" && state.version ? `Shell ${state.version} is missing ${state.missing} required resource${state.missing === 1 ? "" : "s"}.` : undefined}
      className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] px-3 py-2 text-xs font-semibold text-[var(--cos-warning-text)]"
    >
      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
      <span>{state.status === "unsupported" ? "Offline shell unavailable" : "Offline shell incomplete"}</span>
      {state.status === "incomplete" && state.missing > 0 ? <span className="ml-auto font-normal opacity-75">{state.missing} missing</span> : null}
    </div>
  );
}
