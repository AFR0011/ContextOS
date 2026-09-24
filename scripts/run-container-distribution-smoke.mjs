import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const smokeScript = "scripts/container-distribution-smoke.sh";
const passthroughArgs = process.argv.slice(2);

function uniqueExisting(paths) {
  return [...new Set(paths.filter(Boolean).map((item) => path.resolve(item)))].filter((item) => fs.existsSync(item));
}

function windowsGitBashCandidates() {
  const candidates = [
    process.env.CONTEXTOS_BASH,
    process.env.GIT_BASH
  ];

  const gitExecPath = spawnSync("git", ["--exec-path"], {
    encoding: "utf8",
    windowsHide: true
  });
  if (gitExecPath.status === 0) {
    const execPath = gitExecPath.stdout.trim();
    if (execPath) {
      candidates.push(path.resolve(execPath, "../../..", "bin", "bash.exe"));
    }
  }

  const whereGit = spawnSync("where.exe", ["git"], {
    encoding: "utf8",
    windowsHide: true
  });
  if (whereGit.status === 0) {
    for (const gitPath of whereGit.stdout.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
      const gitDir = path.dirname(gitPath);
      const root = path.basename(gitDir).toLowerCase() === "cmd" ? path.dirname(gitDir) : gitDir;
      candidates.push(path.join(root, "bin", "bash.exe"));
    }
  }

  if (process.env.ProgramFiles) {
    candidates.push(path.join(process.env.ProgramFiles, "Git", "bin", "bash.exe"));
  }
  if (process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, "Programs", "Git", "bin", "bash.exe"));
  }

  return uniqueExisting(candidates);
}

function resolveBash() {
  if (process.platform !== "win32") return "bash";

  const candidates = windowsGitBashCandidates();
  if (candidates.length > 0) return candidates[0];

  console.error(
    "Container distribution smoke requires Git for Windows Bash on Windows. " +
    "Install Git for Windows or set CONTEXTOS_BASH to its bash.exe path. " +
    "The WSL bash shim is intentionally not selected because Docker Desktop WSL integration may be disabled."
  );
  process.exit(1);
}

const bash = resolveBash();
console.log(`INFO container smoke shell: ${bash}`);

const result = spawnSync(bash, [smokeScript, ...passthroughArgs], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  windowsHide: false
});

if (result.error) {
  console.error(`Container distribution smoke could not start: ${result.error.message}`);
  process.exit(1);
}

if (result.signal) {
  console.error(`Container distribution smoke terminated by signal ${result.signal}.`);
  process.exit(1);
}

process.exit(result.status ?? 1);
