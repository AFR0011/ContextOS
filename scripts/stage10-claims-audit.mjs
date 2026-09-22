import fs from "node:fs";

const docs = {
  readme: fs.readFileSync("README.md", "utf8"),
  state: fs.readFileSync("docs/PROJECT_STATE.md", "utf8"),
  contract: fs.readFileSync("docs/LOCAL_FIRST_CONTRACT.md", "utf8"),
  run: fs.readFileSync("docs/RUN_PROTOCOL.md", "utf8"),
  deployment: fs.readFileSync("docs/DEPLOYMENT.md", "utf8"),
  security: fs.readFileSync("SECURITY.md", "utf8"),
  blueprint: fs.readFileSync("BLUEPRINT.md", "utf8")
};

const errors = [];
const requireMatch = (name, pattern, message) => {
  if (!pattern.test(docs[name])) errors.push(`${name}: ${message}`);
};

requireMatch("readme", /self-hostable local-first application/i, "must state the current self-hostable application boundary");
requireMatch(
  "readme",
  /(?:after (?:a )?successful (?:sign-in|authentication|authenticated bootstrap)|previously authenticated|prior successful (?:sign-in|authentication))/i,
  "must scope offline workspace access to a previously authenticated device"
);
requireMatch("readme", /canonical persistence/i, "must describe the canonical persistence boundary");
requireMatch("readme", /provider-native (?:PITR|backup\/PITR)/i, "must retain the provider-native recovery boundary");
requireMatch("readme", /irreversible[^\n]*per-record purge/i, "must retain the irreversible record-purge boundary");
requireMatch("readme", /Historical note:[\s\S]{0,500}portfolio-stage/i, "must preserve historical Stage 10 scope as provenance");

requireMatch("state", /self-hostable, local-first workspace application/i, "must record the current self-hostable product state");
requireMatch("state", /Canonical Persistence After C8/i, "must record the C8 canonical persistence boundary");
requireMatch("state", /31800346837/, "must preserve exact historical Stage 10 CI provenance");

requireMatch(
  "contract",
  /Offline workspace access is allowed only for an identity that was previously authenticated successfully on that device/i,
  "must preserve the offline identity boundary"
);
requireMatch("contract", /Offline logout is blocked/i, "must preserve true logout's network requirement");
requireMatch("contract", /canonical persisted workspace is Area \/ Project \/ Task \/ Date \/ DailyNote/i, "must describe the canonical persisted workspace");
requireMatch("contract", /sync contract accepts canonical entity types only and ordinary client mutations are upsert-only/i, "must preserve the canonical sync boundary");
requireMatch("contract", /There is no standalone Archive\/Trash page and no canonical per-record tombstone protocol/i, "must not revive the removed tombstone model");
requireMatch("contract", /does not present irreversible per-record purge/i, "must preserve purge as a non-goal");

requireMatch("run", /optimized production/i, "must assign service-worker/offline reload evidence to the production runtime");
requireMatch("run", /functional local Search query/i, "must include functional offline Search in acceptance");
requireMatch("run", /Current sync accepts canonical entity types and upsert operations only/i, "must describe the live canonical sync contract");
requireMatch("run", /Historical Stage 9 verified recoverable tombstone behavior for the pre-C8 model/i, "must scope tombstone evidence as historical rather than current");

requireMatch("deployment", /self-hostable local-first application/i, "must state the current deployment boundary");
requireMatch("deployment", /real HTTPS Vercel preview/i, "must preserve completed hosted-preview provenance");
requireMatch("deployment", /PostgreSQL-native `pg_dump`\/`pg_restore`/i, "must preserve completed restore provenance");
requireMatch("deployment", /does \*\*not\*\* prove provider-native point-in-time recovery/i, "must scope recovery evidence");
requireMatch("deployment", /not an operated hosted production SaaS/i, "must distinguish software from an operated service");

requireMatch("security", /self-hostable local-first workspace application/i, "must retain the current security maturity boundary");
requireMatch("security", /canonical entity types only: Areas, Projects, Tasks, Dates, and Daily Notes/i, "must describe the canonical sync surface");
requireMatch("security", /canonical schema contains no Capture\/Resource\/Review\/legacy Deadline\/Dashboard\/recovery or per-record tombstone fields/i, "must preserve the C8 deletion-model change");
requireMatch("security", /not an independent security certification/i, "must retain assurance-vs-certification distinction");
requireMatch("security", /provider-native backup\/PITR rehearsal/i, "must retain provider-native recovery boundary");

requireMatch("blueprint", /Area -> Project -> Task/i, "must define the canonical work hierarchy");
requireMatch("blueprint", /There is no standalone Archive page/i, "must keep retired Archive semantics retired");
requireMatch("blueprint", /Sync accepts only canonical entity types and upsert operations/i, "must describe canonical sync");

const activeCanonicalDocs = ["readme", "state", "contract", "run", "deployment", "security", "blueprint"];
const overclaims = [
  /production[- ]ready/i,
  /fully offline/i,
  /works entirely offline/i,
  /all functionality works offline/i,
  /zero data loss/i
];
for (const name of activeCanonicalDocs) {
  for (const pattern of overclaims) {
    if (pattern.test(docs[name])) errors.push(`${name}: unsupported broad public claim matched ${pattern}`);
  }
}

const forbiddenCurrentClaims = [
  /ordinary record deletion (?:is|remains) recoverable synchronized state/i,
  /current .*tombstone protocol/i,
  /current .*Inbox capture/i
];
for (const [name, text] of Object.entries(docs)) {
  for (const pattern of forbiddenCurrentClaims) {
    if (pattern.test(text)) errors.push(`${name}: stale pre-C8 behavior is stated as current: ${pattern}`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exit(1);
}

console.log("Current public claims audit passed: canonical C8-C9 product boundaries and historical Stage 9/10 provenance are aligned.");
