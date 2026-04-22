import { pgTable, text, timestamp, integer, jsonb, boolean, uuid, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const endpoints = pgTable(
  "endpoints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    method: text("method").notNull().default("POST"),
    enabled: boolean("enabled").notNull().default(true),

    // auth
    requireApiKey: boolean("require_api_key").notNull().default(true),
    apiKey: text("api_key").notNull(),
    authHeaderName: text("auth_header_name").notNull().default("x-api-key"),
    authScheme: text("auth_scheme").notNull().default("raw"), // 'raw' | 'bearer'

    // input
    inputMode: text("input_mode").notNull().default("json"), // 'json' | 'form'
    inputSchema: jsonb("input_schema").$type<InputSchema>().notNull().default({ fields: [] }),
    validateInput: boolean("validate_input").notNull().default(false),

    // output
    outputTemplate: jsonb("output_template").$type<unknown>().notNull().default({}),
    statusCode: integer("status_code").notNull().default(200),
    responseHeaders: jsonb("response_headers").$type<Record<string, string>>().notNull().default({}),

    // rules
    rules: jsonb("rules").$type<Rule[]>().notNull().default([]),

    // latency
    delayMode: text("delay_mode").notNull().default("fixed"), // 'fixed' | 'range'
    delayMs: integer("delay_ms").notNull().default(0),
    delayMinMs: integer("delay_min_ms").notNull().default(0),
    delayMaxMs: integer("delay_max_ms").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("endpoints_project_slug_idx").on(t.projectId, t.slug)],
);

export const requestLogs = pgTable(
  "request_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => endpoints.id, { onDelete: "cascade" }),
    method: text("method").notNull(),
    path: text("path").notNull(),
    query: jsonb("query").$type<Record<string, string>>().notNull().default({}),
    headers: jsonb("headers").$type<Record<string, string>>().notNull().default({}),
    body: jsonb("body").$type<unknown>(),
    matchedRuleIndex: integer("matched_rule_index"),
    responseStatus: integer("response_status").notNull(),
    responseBody: jsonb("response_body").$type<unknown>(),
    latencyMs: integer("latency_ms").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("request_logs_endpoint_created_idx").on(t.endpointId, t.createdAt), index("request_logs_created_idx").on(t.createdAt)],
);

export const projectsRelations = relations(projects, ({ many }) => ({
  endpoints: many(endpoints),
}));

export const endpointsRelations = relations(endpoints, ({ one, many }) => ({
  project: one(projects, { fields: [endpoints.projectId], references: [projects.id] }),
  logs: many(requestLogs),
}));

export const requestLogsRelations = relations(requestLogs, ({ one }) => ({
  endpoint: one(endpoints, { fields: [requestLogs.endpointId], references: [endpoints.id] }),
}));

// ---- types ----
export type InputField = {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required?: boolean;
  description?: string;
};
export type InputSchema = {
  fields: InputField[];
  // optional raw JSON sample when inputMode === 'json'
  sample?: unknown;
};

export type RuleOperator =
  | "eq"
  | "neq"
  | "contains"
  | "not_contains"
  | "exists"
  | "not_exists"
  | "gt"
  | "lt"
  | "gte"
  | "lte";

export type Rule = {
  name?: string;
  when: { path: string; op: RuleOperator; value?: unknown }[];
  thenStatus?: number;
  thenBody: unknown;
  thenHeaders?: Record<string, string>;
};

export type Project = typeof projects.$inferSelect;
export type Endpoint = typeof endpoints.$inferSelect;
export type RequestLog = typeof requestLogs.$inferSelect;
