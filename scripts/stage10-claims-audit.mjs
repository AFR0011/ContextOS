import fs from "node:fs";

const registry = JSON.parse(fs.readFileSync("audits/stage10-acceptance.json", "utf8"));
const close = registry.evidence?.find((entry) => entry.id === "CLOSE-001");
const stage10Closed = close?.status === "passed";

const docs = {
  readme: fs.readFileSync("README.md", "utf8"),
  state: fs.readFileSync("docs/PROJECT_STATE.md", "utf8"),
  contract: fs.readFileSync("docs/LOCAL_FIRST_CONTRACT.md", "utf8"),
  run: fs.readFileSync("docs/RUN_PROTOCOL.md", "utf8"),
  deployment: fs.readFileSync("docs/DEPLOYMENT.md", "utf8"),
  security: fs.readFileSync("SECURITY.md", "utf8")
};

const errors = [];
const requireMatch = (name, pattern, message) => {
  if (!pattern.test(docs[name])) errors.push(`${name}: ${message}`);
};

requireMatch("readme", /portfolio-stage/i, "must retain the portfolio-stage boundary");
requireMatch(
  "readme",
  /(?:after (?:a )?successful (?:sign-in|authentication)|previously authenticated|prior successful (?:sign-in|authentication))/i,
  "must scope offline workspace access to a previously authenticated device"
);
requireMatch("readme", /provider-native (?:PITR|backup\/PITR)/i, "must retain the provider-native recovery boundary");
requireMatch("readme", /irreversible[^\n]*per-record purge/i, "must retain the irreversible record-purge boundary");

requireMatch("state", /complete through \*\*Stage 9/i, "must preserve the Stage 9 closure provenance");
requireMatch("state", /31798664757/, "must preserve exact Stage 9 verified runtime CI provenance");

requireMatch("contract", /Offline workspace access is allowed only for an identity that was previously authenticated successfully on that device/i, "must preserve the offline identity boundary");
requireMatch("contract", /Offline logout is blocked/i, "must preserve true logout's network requirement");
requireMatch("contract", /does not currently promise irreversible per-record purge/i, "must preserve purge non-claim");

requireMatch("run", /optimized production/i, "must assign service-worker/offline reload evidence to the production runtime");
requireMatch("run", /functional local Search query/i, "must include functional offline Search in final acceptance");
requireMatch("run", /Stage 9 formalized ordinary user deletion as synchronized recoverable state/i, "must not defer deletion semantics beyond Stage 9");
requireMatch("run", /PostgreSQL-native `pg_dump`\/`pg_restore`/i, "must record the completed provider-neutral recovery evidence");

requireMatch("deployment", /real HTTPS Vercel preview/i, "must record the completed Stage 8 hosted-preview evidence");
requireMatch("deployment", /PostgreSQL-native `pg_dump`\/`pg_restore`/i, "must record the completed restore rehearsal");
requireMatch("deployment", /does \*\*not\*\* prove provider-native point-in-time recovery/i, "must scope recovery evidence rather than generalizing it");
requireMatch("deployment", /not a hosted production SaaS/i, "must retain deployment-maturity boundary");

requireMatch("security", /portfolio-stage application/i, "must retain security maturity boundary");
requireMatch("security", /not an independent security certification/i, "must retain assurance-vs-certification distinction");
requireMatch("security", /provider-native backup\/PITR rehearsal/i, "must retain provider-native recovery boundary");

if (stage10Closed) {
  requireMatch("readme", /Stage 10[^\n]*(?:closed|complete)/i, "must record final Stage 10 closure after CLOSE-001 passes");
  requireMatch("state", /Stage 10[^\n]*(?:closed|complete)/i, "must record Stage 10 as closed after CLOSE-001 passes");
  requireMatch("contract", /Stage 10[^\n]*(?:closed|complete|final acceptance)/i, "must record final acceptance provenance after closure");
  requireMatch("security", /Stage 10[^\n]*(?:closed|complete|final acceptance)/i, "must record Stage 10 assurance closure while retaining security non-claims");
} else {
  requireMatch("readme", /Stage 10[^\n]*(?:in progress|remain(?:s)? open|remain(?:s)? in progress)/i, "must state that Stage 10 final acceptance is still open");
  requireMatch("state", /Stage 10[^\n]*(?:remain(?:s)?|open)/i, "must keep Stage 10 open before final closure");
  requireMatch("contract", /Stage 10[^\n]*final/i, "must reserve final acceptance for Stage 10 while it remains open");
  requireMatch("security", /Stage 10 final comprehensive local-first acceptance/i, "must keep final acceptance open before Stage 10 closure");
}

const stalePatterns = [
  /final logout\/account\/local-device-data and hard-delete lifecycle semantics remain later-stage work/i,
  /deferred lifecycle semantics/i,
  /before the later lifecycle stage owns deletion/i,
  /backup\/restore and compatible application\/database rollback rehearsal remain deployment gates, not claims made by this repository/i
];
for (const [name, text] of Object.entries(docs)) {
  for (const pattern of stalePatterns) {
    if (pattern.test(text)) errors.push(`${name}: contains stale pre-Stage-9/Stage-8 wording: ${pattern}`);
  }
}

// These phrases are forbidden as affirmative broad claims. Explicit negated boundary
// statements such as "not compliance-certified" are handled by required non-claim checks
// instead of being mistaken for claims merely because the noun appears in the sentence.
const overclaims = [
  /production[- ]ready/i,
  /fully offline/i,
  /works entirely offline/i,
  /all functionality works offline/i,
  /zero data loss/i
];
for (const [name, text] of Object.entries(docs)) {
  for (const pattern of overclaims) {
    if (pattern.test(text)) errors.push(`${name}: unsupported broad public claim matched ${pattern}`);
  }
}

if (errors.length) {
  errors.forEach((error) => console.error(`FAIL ${error}`));
  process.exit(1);
}

console.log(`Stage 10 public claims audit passed (${stage10Closed ? "closed" : "open"} acceptance state): evidence, runtime, maturity, recovery, lifecycle, and non-goal boundaries are aligned.`);
