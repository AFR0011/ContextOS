import { relations, sql } from "drizzle-orm";
import {
  AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const workspaceParaType = pgEnum("workspace_para_type", [
  "projects",
  "areas",
  "resources",
  "archive",
  "custom",
]);

export const privacyLevel = pgEnum("privacy_level", [
  "normal",
  "private",
  "locked",
]);

export const contextType = pgEnum("context_type", [
  "project",
  "area",
  "resource",
  "archive_item",
]);

export const contextStatus = pgEnum("context_status", [
  "active",
  "paused",
  "waiting",
  "blocked",
  "completed",
  "archived",
]);

export const priority = pgEnum("priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const pageType = pgEnum("page_type", [
  "normal_page",
  "project_state",
  "blueprint",
  "handoff",
  "changelog",
  "meeting_note",
  "scratch_note",
  "reference",
  "archived_note",
]);

export const pageStatus = pgEnum("page_status", ["active", "archived"]);

export const actorType = pgEnum("actor_type", ["human", "agent", "system"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name"),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    paraType: workspaceParaType("para_type").notNull().default("custom"),
    privacyLevel: privacyLevel("privacy_level").notNull().default("normal"),
    agentAccessEnabled: boolean("agent_access_enabled")
      .notNull()
      .default(true),
    ...timestamps,
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("workspaces_owner_slug_unique").on(table.ownerId, table.slug),
    index("workspaces_owner_idx").on(table.ownerId),
  ],
);

export const contexts = pgTable(
  "contexts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    contextType: contextType("context_type").notNull().default("project"),
    status: contextStatus("status").notNull().default("active"),
    priority: priority("priority").notNull().default("medium"),
    currentObjective: text("current_objective"),
    currentPhase: text("current_phase"),
    nextAction: text("next_action"),
    agentAccessEnabled: boolean("agent_access_enabled")
      .notNull()
      .default(true),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    ...timestamps,
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("contexts_workspace_slug_unique").on(
      table.workspaceId,
      table.slug,
    ),
    index("contexts_workspace_idx").on(table.workspaceId),
    index("contexts_owner_idx").on(table.ownerId),
  ],
);

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    contextId: uuid("context_id").references(() => contexts.id, {
      onDelete: "set null",
    }),
    parentId: uuid("parent_id").references((): AnyPgColumn => pages.id, {
      onDelete: "set null",
    }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    pageType: pageType("page_type").notNull().default("normal_page"),
    contentJson: jsonb("content_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    contentMd: text("content_md").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    status: pageStatus("status").notNull().default("active"),
    version: integer("version").notNull().default(1),
    agentAccessEnabled: boolean("agent_access_enabled")
      .notNull()
      .default(true),
    createdBy: actorType("created_by").notNull().default("human"),
    updatedBy: actorType("updated_by").notNull().default("human"),
    ...timestamps,
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("pages_parent_slug_unique").on(table.parentId, table.slug),
    index("pages_workspace_idx").on(table.workspaceId),
    index("pages_context_idx").on(table.contextId),
    index("pages_parent_idx").on(table.parentId),
    index("pages_owner_idx").on(table.ownerId),
  ],
);

export const pageVersions = pgTable(
  "page_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    contentJson: jsonb("content_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    contentMd: text("content_md").notNull().default(""),
    changeSummary: text("change_summary"),
    changedByType: actorType("changed_by_type").notNull().default("human"),
    changedById: uuid("changed_by_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("page_versions_page_version_unique").on(
      table.pageId,
      table.version,
    ),
    index("page_versions_page_idx").on(table.pageId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  workspaces: many(workspaces),
  contexts: many(contexts),
  pages: many(pages),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  contexts: many(contexts),
  pages: many(pages),
}));

export const contextsRelations = relations(contexts, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [contexts.workspaceId],
    references: [workspaces.id],
  }),
  owner: one(users, {
    fields: [contexts.ownerId],
    references: [users.id],
  }),
  pages: many(pages),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [pages.workspaceId],
    references: [workspaces.id],
  }),
  context: one(contexts, {
    fields: [pages.contextId],
    references: [contexts.id],
  }),
  parent: one(pages, {
    fields: [pages.parentId],
    references: [pages.id],
    relationName: "page_tree",
  }),
  children: many(pages, {
    relationName: "page_tree",
  }),
  owner: one(users, {
    fields: [pages.ownerId],
    references: [users.id],
  }),
  versions: many(pageVersions),
}));

export const pageVersionsRelations = relations(pageVersions, ({ one }) => ({
  page: one(pages, {
    fields: [pageVersions.pageId],
    references: [pages.id],
  }),
}));
