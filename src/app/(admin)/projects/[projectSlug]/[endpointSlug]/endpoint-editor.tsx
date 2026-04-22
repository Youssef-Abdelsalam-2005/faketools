"use client";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Trash2, RotateCw, Plus, Check, GitFork } from "lucide-react";
import { updateEndpoint, rotateApiKey, deleteEndpoint, duplicateEndpoint } from "@/lib/actions/endpoints";
import type { Endpoint, InputField, Rule, RuleOperator } from "@/lib/db/schema";
import { BodyEditor, KvEditor } from "@/components/body-editor";
import { TemplateInput } from "@/components/template-input";
import { buildSuggestions } from "@/lib/template-suggestions";
import { AIAssistant, type EditorState, type FullSnapshot } from "./ai-assistant";
import { ChangeBadge, type Origin } from "@/components/change-badge";
import { cn } from "@/lib/utils";

type LogRowT = {
  id: string;
  method: string;
  path: string;
  responseStatus: number;
  latencyMs: number;
  createdAt: string;
  body: unknown;
  responseBody: unknown;
  matchedRuleIndex: number | null;
  error: string | null;
};

type SerializedEndpoint = Omit<Endpoint, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string };

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];
const OPS: { value: RuleOperator; label: string }[] = [
  { value: "eq", label: "=" },
  { value: "neq", label: "≠" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "!contains" },
  { value: "exists", label: "exists" },
  { value: "not_exists", label: "!exists" },
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
  { value: "gte", label: "≥" },
  { value: "lte", label: "≤" },
];

function toJson(x: unknown) { try { return JSON.stringify(x ?? {}, null, 2); } catch { return "{}"; } }
function parseJson<T = unknown>(s: string): { ok: true; value: T } | { ok: false; error: string } {
  try { return { ok: true, value: JSON.parse(s) as T }; } catch (e: any) { return { ok: false, error: e.message }; }
}

/* ------------ Baseline + origin tracking ------------ */
type Baseline = {
  name: string; method: string; enabled: boolean; requireApiKey: boolean;
  authHeaderName: string; authScheme: string; inputMode: string; validateInput: boolean;
  statusCode: number; delayMode: string; delayMs: number; delayMinMs: number; delayMaxMs: number;
  outputText: string; headersText: string; sampleText: string;
  fieldsStr: string; rulesStr: string;
};

const TRACK_KEYS = [
  "name", "method", "enabled",
  "requireApiKey", "authHeaderName", "authScheme",
  "inputMode", "validateInput", "inputSchema",
  "outputTemplate", "statusCode", "responseHeaders",
  "rules",
  "delayMode", "delayMs", "delayMinMs", "delayMaxMs",
] as const;
type TrackKey = (typeof TRACK_KEYS)[number];

export function EndpointEditor({
  appUrl,
  projectSlug,
  endpoint: initial,
  logs,
  projects,
}: {
  appUrl: string;
  projectSlug: string;
  endpoint: SerializedEndpoint;
  logs: LogRowT[];
  projects: { id: string; name: string; slug: string }[];
}) {
  const [ep, setEp] = React.useState(initial);
  const [outputText, setOutputText] = React.useState(toJson(initial.outputTemplate));
  const [headersText, setHeadersText] = React.useState(toJson(initial.responseHeaders));
  const [sampleText, setSampleText] = React.useState(toJson(initial.inputSchema?.sample ?? {}));
  const [rules, setRules] = React.useState<Rule[]>(initial.rules ?? []);
  const [fields, setFields] = React.useState<InputField[]>(initial.inputSchema?.fields ?? []);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dupOpen, setDupOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [origins, setOrigins] = React.useState<Partial<Record<TrackKey, Origin>>>({});
  const [baseline, setBaseline] = React.useState<Baseline>(() => ({
    name: initial.name, method: initial.method, enabled: initial.enabled, requireApiKey: initial.requireApiKey,
    authHeaderName: initial.authHeaderName, authScheme: initial.authScheme, inputMode: initial.inputMode,
    validateInput: initial.validateInput, statusCode: initial.statusCode, delayMode: initial.delayMode,
    delayMs: initial.delayMs, delayMinMs: initial.delayMinMs, delayMaxMs: initial.delayMaxMs,
    outputText: toJson(initial.outputTemplate), headersText: toJson(initial.responseHeaders),
    sampleText: toJson(initial.inputSchema?.sample ?? {}),
    fieldsStr: JSON.stringify(initial.inputSchema?.fields ?? []),
    rulesStr: JSON.stringify(initial.rules ?? []),
  }));

  const url = `${appUrl || ""}/mock/${projectSlug}/${ep.slug}`;

  const suggestions = React.useMemo(() => {
    let sample: unknown = undefined;
    try { sample = JSON.parse(sampleText || "{}"); } catch {}
    return buildSuggestions({ fields, sample });
  }, [fields, sampleText]);

  const markYou = (keys: TrackKey | TrackKey[]) => {
    const arr = Array.isArray(keys) ? keys : [keys];
    setOrigins((o) => {
      const n = { ...o };
      for (const k of arr) n[k] = "you";
      return n;
    });
  };

  const isDirty = (k: TrackKey): boolean => {
    switch (k) {
      case "outputTemplate": return outputText !== baseline.outputText;
      case "responseHeaders": return headersText !== baseline.headersText;
      case "inputSchema": return sampleText !== baseline.sampleText || JSON.stringify(fields) !== baseline.fieldsStr;
      case "rules": return JSON.stringify(rules) !== baseline.rulesStr;
      default: return (ep as any)[k] !== (baseline as any)[k];
    }
  };

  const badge = (k: TrackKey) => (isDirty(k) ? <ChangeBadge origin={origins[k]} /> : null);

  /* ------ tracked setters ------ */
  const updEp = (patch: Partial<SerializedEndpoint>, keys: TrackKey[]) => {
    setEp((p) => ({ ...p, ...patch }));
    markYou(keys);
  };
  const updOutput = (v: string) => { setOutputText(v); markYou("outputTemplate"); };
  const updHeaders = (v: string) => { setHeadersText(v); markYou("responseHeaders"); };
  const updSample = (v: string) => { setSampleText(v); markYou("inputSchema"); };
  const updFields = (f: InputField[]) => { setFields(f); markYou("inputSchema"); };
  const updRules = (r: Rule[]) => { setRules(r); markYou("rules"); };

  /* ------ snapshot / restore (for AI) ------ */
  const snapshot = (): FullSnapshot => ({
    state: {
      name: ep.name, method: ep.method, enabled: ep.enabled, requireApiKey: ep.requireApiKey,
      authHeaderName: ep.authHeaderName, authScheme: ep.authScheme, inputMode: ep.inputMode,
      validateInput: ep.validateInput, statusCode: ep.statusCode, delayMode: ep.delayMode,
      delayMs: ep.delayMs, delayMinMs: ep.delayMinMs, delayMaxMs: ep.delayMaxMs,
      outputText, headersText, sampleText, fields, rules,
    },
    origins: { ...origins },
  });

  const restore = (s: FullSnapshot) => {
    setEp((p) => ({
      ...p,
      name: s.state.name, method: s.state.method, enabled: s.state.enabled,
      requireApiKey: s.state.requireApiKey, authHeaderName: s.state.authHeaderName, authScheme: s.state.authScheme,
      inputMode: s.state.inputMode, validateInput: s.state.validateInput, statusCode: s.state.statusCode,
      delayMode: s.state.delayMode, delayMs: s.state.delayMs, delayMinMs: s.state.delayMinMs, delayMaxMs: s.state.delayMaxMs,
    }));
    setOutputText(s.state.outputText);
    setHeadersText(s.state.headersText);
    setSampleText(s.state.sampleText);
    setFields(s.state.fields);
    setRules(s.state.rules);
    setOrigins(s.origins);
  };

  const save = async () => {
    setError(null);
    const outRes = parseJson<unknown>(outputText);
    if (!outRes.ok) return setError(`output template: ${outRes.error}`);
    const hdrRes = parseJson<Record<string, string>>(headersText);
    if (!hdrRes.ok) return setError(`response headers: ${hdrRes.error}`);
    let sample: unknown = undefined;
    if (sampleText.trim()) {
      const sRes = parseJson(sampleText);
      if (!sRes.ok) return setError(`input sample: ${sRes.error}`);
      sample = sRes.value;
    }
    setSaving(true);
    try {
      await updateEndpoint(ep.id, {
        name: ep.name, method: ep.method, enabled: ep.enabled,
        requireApiKey: ep.requireApiKey,
        authHeaderName: ep.authHeaderName, authScheme: ep.authScheme as any,
        inputMode: ep.inputMode as any,
        inputSchema: { fields, sample },
        validateInput: ep.validateInput,
        outputTemplate: outRes.value,
        statusCode: ep.statusCode,
        responseHeaders: hdrRes.value,
        rules,
        delayMode: ep.delayMode as any, delayMs: ep.delayMs, delayMinMs: ep.delayMinMs, delayMaxMs: ep.delayMaxMs,
      });
      setSavedAt(Date.now());
      // reset baseline + origins
      setBaseline({
        name: ep.name, method: ep.method, enabled: ep.enabled, requireApiKey: ep.requireApiKey,
        authHeaderName: ep.authHeaderName, authScheme: ep.authScheme, inputMode: ep.inputMode,
        validateInput: ep.validateInput, statusCode: ep.statusCode, delayMode: ep.delayMode,
        delayMs: ep.delayMs, delayMinMs: ep.delayMinMs, delayMaxMs: ep.delayMaxMs,
        outputText, headersText, sampleText,
        fieldsStr: JSON.stringify(fields),
        rulesStr: JSON.stringify(rules),
      });
      setOrigins({});
    } catch (e: any) {
      setError(e.message || "save failed");
    } finally {
      setSaving(false);
    }
  };

  const onRotate = async () => {
    if (!confirm("Rotate API key? Existing clients will break.")) return;
    const key = await rotateApiKey(ep.id);
    setEp((p) => ({ ...p, apiKey: key }));
  };
  const onDelete = async () => {
    if (!confirm("Delete this endpoint permanently?")) return;
    await deleteEndpoint(ep.id, projectSlug);
  };
  const onCopyUrl = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const curl = (() => {
    const parts: string[] = [`curl -X ${ep.method} '${url}'`];
    if (ep.requireApiKey) {
      if (ep.authScheme === "bearer") parts.push(`  -H 'Authorization: Bearer ${ep.apiKey}'`);
      else parts.push(`  -H '${ep.authHeaderName}: ${ep.apiKey}'`);
    }
    if (["POST", "PUT", "PATCH"].includes(ep.method)) {
      parts.push(`  -H 'Content-Type: application/json'`);
      const sample = sampleText.trim() || "{}";
      parts.push(`  -d '${sample.replace(/\n\s*/g, "")}'`);
    }
    return parts.join(" \\\n");
  })();

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="serif text-[48px] leading-none tracking-tight">{ep.name}</h1>
          <div className="meta mt-2">/mock/{projectSlug}/{ep.slug}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setDupOpen(true)}>
            <GitFork className="h-4 w-4" /> Duplicate
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          {/* General */}
          <Section title="General">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>name {badge("name")}</Label>
                <Input value={ep.name} onChange={(e) => updEp({ name: e.target.value }, ["name"])} />
              </div>
              <div>
                <Label>method {badge("method")}</Label>
                <Select value={ep.method} onValueChange={(v) => updEp({ method: v }, ["method"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Switch checked={ep.enabled} onCheckedChange={(v) => updEp({ enabled: v }, ["enabled"])} />
              <Label className="mb-0">enabled {badge("enabled")}</Label>
              <span className="meta ml-4">(when off, responds 503)</span>
            </div>
          </Section>

          {/* Auth */}
          <Section title="Authentication">
            <div className="flex items-center gap-3">
              <Switch checked={ep.requireApiKey} onCheckedChange={(v) => updEp({ requireApiKey: v }, ["requireApiKey"])} />
              <Label className="mb-0">require api key {badge("requireApiKey")}</Label>
            </div>
            {ep.requireApiKey && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>header name {badge("authHeaderName")}</Label>
                    <Input value={ep.authHeaderName} onChange={(e) => updEp({ authHeaderName: e.target.value }, ["authHeaderName"])} />
                  </div>
                  <div>
                    <Label>scheme {badge("authScheme")}</Label>
                    <Select value={ep.authScheme} onValueChange={(v) => updEp({ authScheme: v }, ["authScheme"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="raw">raw (header = key)</SelectItem>
                        <SelectItem value="bearer">bearer (header = "Bearer &lt;key&gt;")</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>api key</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={ep.apiKey} className="mono" />
                    <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(ep.apiKey)}><Copy className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" onClick={onRotate}><RotateCw className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Input */}
          <Section title="Input">
            <Tabs value={ep.inputMode} onValueChange={(v) => updEp({ inputMode: v as any }, ["inputMode"])}>
              <div className="flex items-center gap-4">
                <TabsList>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                  <TabsTrigger value="form">Fields</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <Switch checked={ep.validateInput} onCheckedChange={(v) => updEp({ validateInput: v }, ["validateInput"])} />
                  <span className="meta">validate incoming {badge("validateInput")}</span>
                </div>
                <div className="ml-auto">{badge("inputSchema")}</div>
              </div>
              <TabsContent value="json" className="mt-4">
                <Label>sample body</Label>
                <Textarea className="min-h-[180px]" value={sampleText} onChange={(e) => updSample(e.target.value)} />
                <div className="meta mt-2">paths from this sample are used for template autocomplete</div>
              </TabsContent>
              <TabsContent value="form" className="mt-4">
                <FieldsEditor fields={fields} setFields={updFields} />
              </TabsContent>
            </Tabs>
          </Section>

          {/* Output */}
          <Section title="Output">
            <div className="grid grid-cols-[1fr_160px] gap-4">
              <div>
                <Label>response body template {badge("outputTemplate")}</Label>
                <BodyEditor valueJsonText={outputText} onChange={updOutput} suggestions={suggestions} minHeight="220px" />
                <div className="meta mt-2">type {'{{'} for helper suggestions</div>
              </div>
              <div>
                <Label>status code {badge("statusCode")}</Label>
                <Input type="number" value={ep.statusCode} onChange={(e) => updEp({ statusCode: Number(e.target.value) }, ["statusCode"])} />
              </div>
            </div>
            <div className="mt-4">
              <Label>response headers {badge("responseHeaders")}</Label>
              <KvEditor valueJsonText={headersText} onChange={updHeaders} suggestions={suggestions} />
            </div>
          </Section>

          {/* Rules */}
          <Section title={<span>Rules {badge("rules")}</span>}>
            <RulesEditor rules={rules} setRules={updRules} suggestions={suggestions} />
          </Section>

          {/* Latency */}
          <Section title="Latency">
            <div className="flex items-center gap-4">
              <Select value={ep.delayMode} onValueChange={(v) => updEp({ delayMode: v }, ["delayMode"])}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">fixed</SelectItem>
                  <SelectItem value="range">range</SelectItem>
                </SelectContent>
              </Select>
              {ep.delayMode === "fixed" ? (
                <div className="flex items-center gap-2">
                  <Input type="number" className="w-[120px]" value={ep.delayMs} onChange={(e) => updEp({ delayMs: Number(e.target.value) }, ["delayMs"])} />
                  <span className="meta">ms {badge("delayMs")}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input type="number" className="w-[120px]" value={ep.delayMinMs} onChange={(e) => updEp({ delayMinMs: Number(e.target.value) }, ["delayMinMs"])} />
                  <span className="meta">–</span>
                  <Input type="number" className="w-[120px]" value={ep.delayMaxMs} onChange={(e) => updEp({ delayMaxMs: Number(e.target.value) }, ["delayMaxMs"])} />
                  <span className="meta">ms {badge("delayMinMs") ?? badge("delayMaxMs")}</span>
                </div>
              )}
              {badge("delayMode")}
            </div>
          </Section>

          {/* Save bar */}
          <div className="sticky bottom-4 flex items-center justify-between border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div className="meta">
              {error ? <span className="text-[var(--destructive)]">{error}</span>
                : savedAt ? `saved ${new Date(savedAt).toLocaleTimeString()}`
                : Object.keys(origins).length > 0 ? <span>{Object.keys(origins).length} unsaved change{Object.keys(origins).length === 1 ? "" : "s"}</span>
                : "no changes"}
            </div>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <Section title="Endpoint URL">
            <div className="flex items-center gap-2">
              <Input readOnly value={url} className="mono text-xs" />
              <Button variant="outline" size="icon" onClick={onCopyUrl}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
            </div>
            <div className="mt-3">
              <Label>curl</Label>
              <pre className="mono whitespace-pre-wrap break-all border border-[var(--border)] bg-[var(--input)] p-3 text-[11px] leading-relaxed">{curl}</pre>
            </div>
          </Section>

          <Section title="Recent requests">
            {logs.length === 0 && <div className="meta">no requests yet</div>}
            <div className="divide-y divide-[var(--border)]">
              {logs.map((l) => <LogItem key={l.id} log={l} />)}
            </div>
          </Section>
        </div>
      </div>

      <DuplicateDialog open={dupOpen} onOpenChange={setDupOpen} endpointId={ep.id} defaultName={`${ep.name} copy`} projects={projects} />
      <AIAssistant snapshot={snapshot} restore={restore} setOriginsAI={(keys) => setOrigins((o) => { const n = { ...o }; for (const k of keys) n[k as TrackKey] = "ai"; return n; })} />
    </div>
  );
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="meta mb-3 border-b border-[var(--border)] pb-2">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function FieldsEditor({ fields, setFields }: { fields: InputField[]; setFields: (f: InputField[]) => void }) {
  const update = (i: number, patch: Partial<InputField>) => {
    const next = fields.slice();
    next[i] = { ...next[i], ...patch };
    setFields(next);
  };
  const remove = (i: number) => setFields(fields.filter((_, idx) => idx !== i));
  const add = () => setFields([...fields, { name: "", type: "string", required: false }]);
  return (
    <div className="space-y-2">
      {fields.map((f, i) => (
        <div key={i} className="grid grid-cols-[1fr_140px_100px_auto] items-center gap-2">
          <Input placeholder="field name" value={f.name} onChange={(e) => update(i, { name: e.target.value })} />
          <Select value={f.type} onValueChange={(v) => update(i, { type: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["string","number","boolean","object","array"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="meta flex items-center gap-2">
            <input type="checkbox" checked={!!f.required} onChange={(e) => update(i, { required: e.target.checked })} />
            required
          </label>
          <Button variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}><Plus className="h-3.5 w-3.5" /> Add field</Button>
    </div>
  );
}

function RulesEditor({ rules, setRules, suggestions }: { rules: Rule[]; setRules: (r: Rule[]) => void; suggestions: string[] }) {
  const addRule = () =>
    setRules([...rules, { name: "", when: [{ path: "input.", op: "eq", value: "" }], thenStatus: 200, thenBody: { matched: true } }]);
  const remove = (i: number) => setRules(rules.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<Rule>) => {
    const next = rules.slice();
    next[i] = { ...next[i], ...patch };
    setRules(next);
  };
  return (
    <div className="space-y-4">
      {rules.length === 0 && <div className="meta">no rules — default output is used for every request</div>}
      {rules.map((r, i) => (
        <div key={i} className="border border-[var(--border)] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Input
              placeholder={`rule ${i + 1} name (optional)`}
              value={r.name ?? ""}
              onChange={(e) => update(i, { name: e.target.value })}
              className="max-w-sm"
            />
            <Button variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
          </div>
          <Label>when (all must match)</Label>
          <div className="space-y-2">
            {r.when.map((c, ci) => (
              <div key={ci} className="grid grid-cols-[1fr_140px_1fr_auto] gap-2">
                <TemplateInput
                  mode="identifier"
                  placeholder="input.action"
                  suggestions={suggestions}
                  value={c.path}
                  onChange={(v) => {
                    const when = r.when.slice();
                    when[ci] = { ...when[ci], path: v };
                    update(i, { when });
                  }}
                />
                <Select
                  value={c.op}
                  onValueChange={(v) => {
                    const when = r.when.slice();
                    when[ci] = { ...when[ci], op: v as RuleOperator };
                    update(i, { when });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="value"
                  value={String(c.value ?? "")}
                  onChange={(e) => {
                    const when = r.when.slice();
                    when[ci] = { ...when[ci], value: e.target.value };
                    update(i, { when });
                  }}
                  disabled={c.op === "exists" || c.op === "not_exists"}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const when = r.when.filter((_, idx) => idx !== ci);
                    update(i, { when });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => update(i, { when: [...r.when, { path: "input.", op: "eq", value: "" }] })}
            >
              <Plus className="h-3.5 w-3.5" /> Add condition
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-[120px_1fr] gap-4">
            <div>
              <Label>status</Label>
              <Input
                type="number"
                value={r.thenStatus ?? 200}
                onChange={(e) => update(i, { thenStatus: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>body</Label>
              <RuleBodyEditor
                body={r.thenBody}
                onChange={(parsed) => update(i, { thenBody: parsed })}
                suggestions={suggestions}
              />
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={addRule}><Plus className="h-4 w-4" /> Add rule</Button>
    </div>
  );
}

function RuleBodyEditor({ body, onChange, suggestions }: { body: unknown; onChange: (parsed: unknown) => void; suggestions: string[] }) {
  const [text, setText] = React.useState(() => { try { return JSON.stringify(body ?? {}, null, 2); } catch { return "{}"; } });
  const lastSerialized = React.useRef(text);
  React.useEffect(() => {
    const serialized = (() => { try { return JSON.stringify(body ?? {}, null, 2); } catch { return "{}"; } })();
    if (serialized !== lastSerialized.current) {
      setText(serialized);
      lastSerialized.current = serialized;
    }
  }, [body]);
  return (
    <BodyEditor
      valueJsonText={text}
      onChange={(t) => {
        setText(t);
        try {
          const parsed = JSON.parse(t);
          lastSerialized.current = JSON.stringify(parsed ?? {}, null, 2);
          onChange(parsed);
        } catch { /* keep local text, don't push to parent */ }
      }}
      suggestions={suggestions}
      minHeight="120px"
    />
  );
}

function LogItem({ log }: { log: LogRowT }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="py-2">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="mono text-[11px] font-semibold">{log.method}</span>
          <span className={cn("mono text-[11px]", log.responseStatus >= 400 && "text-[var(--destructive)]")}>{log.responseStatus}</span>
          <span className="meta">{log.latencyMs}ms</span>
        </div>
        <span className="meta">{new Date(log.createdAt).toLocaleTimeString()}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <div>
            <div className="meta mb-1">request body</div>
            <pre className="mono max-h-60 overflow-auto border border-[var(--border)] bg-[var(--input)] p-2 text-[11px]">{JSON.stringify(log.body ?? null, null, 2)}</pre>
          </div>
          <div>
            <div className="meta mb-1">response</div>
            <pre className="mono max-h-60 overflow-auto border border-[var(--border)] bg-[var(--input)] p-2 text-[11px]">{JSON.stringify(log.responseBody ?? null, null, 2)}</pre>
          </div>
          {log.error && <div className="meta text-[var(--destructive)]">error: {log.error}</div>}
        </div>
      )}
    </div>
  );
}

function DuplicateDialog({
  open, onOpenChange, endpointId, defaultName, projects,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  endpointId: string;
  defaultName: string;
  projects: { id: string; name: string; slug: string }[];
}) {
  const [targetId, setTargetId] = React.useState(projects[0]?.id ?? "");
  const [name, setName] = React.useState(defaultName);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate endpoint</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>target project</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>new name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => duplicateEndpoint(endpointId, targetId, name)}>Duplicate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
