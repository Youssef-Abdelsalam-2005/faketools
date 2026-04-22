"use client";
import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TemplateTextarea, TemplateInput } from "./template-input";
import { Plus, Trash2, TriangleAlert } from "lucide-react";

type Row = { key: string; type: "string" | "number" | "boolean" | "null"; value: string };

function objectToRows(obj: unknown): { rows: Row[]; ok: boolean } {
  if (obj == null || typeof obj !== "object" || Array.isArray(obj)) return { rows: [], ok: false };
  const rows: Row[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== null && typeof v === "object") return { rows: [], ok: false };
    if (typeof v === "string") rows.push({ key: k, type: "string", value: v });
    else if (typeof v === "number") rows.push({ key: k, type: "number", value: String(v) });
    else if (typeof v === "boolean") rows.push({ key: k, type: "boolean", value: v ? "true" : "false" });
    else if (v === null) rows.push({ key: k, type: "null", value: "" });
    else return { rows: [], ok: false };
  }
  return { rows, ok: true };
}

function rowsToObject(rows: Row[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    if (!r.key) continue;
    if (r.type === "string") out[r.key] = r.value;
    else if (r.type === "number") out[r.key] = r.value === "" ? 0 : isNaN(Number(r.value)) ? r.value : Number(r.value);
    else if (r.type === "boolean") out[r.key] = r.value === "true";
    else out[r.key] = null;
  }
  return out;
}

export function BodyEditor({
  valueJsonText,
  onChange,
  suggestions,
  minHeight = "180px",
}: {
  valueJsonText: string;
  onChange: (jsonText: string) => void;
  suggestions: string[];
  minHeight?: string;
}) {
  const [mode, setMode] = React.useState<"json" | "fields">("json");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [flatten, setFlatten] = React.useState(true);

  const switchToFields = () => {
    try {
      const parsed = JSON.parse(valueJsonText || "{}");
      const { rows, ok } = objectToRows(parsed);
      setRows(rows);
      setFlatten(ok);
      setMode("fields");
    } catch {
      setRows([]);
      setFlatten(false);
      setMode("fields");
    }
  };

  const switchToJson = () => {
    const obj = rowsToObject(rows);
    onChange(JSON.stringify(obj, null, 2));
    setMode("json");
  };

  const commitRows = (next: Row[]) => {
    setRows(next);
    onChange(JSON.stringify(rowsToObject(next), null, 2));
  };

  return (
    <Tabs value={mode} onValueChange={(v) => (v === "fields" ? switchToFields() : switchToJson())}>
      <TabsList>
        <TabsTrigger value="json">JSON</TabsTrigger>
        <TabsTrigger value="fields">Fields</TabsTrigger>
      </TabsList>
      <TabsContent value="json" className="mt-3">
        <TemplateTextarea
          value={valueJsonText}
          onChange={onChange}
          suggestions={suggestions}
          minHeight={minHeight}
        />
      </TabsContent>
      <TabsContent value="fields" className="mt-3">
        {!flatten && (
          <div className="mb-3 flex items-center gap-2 border border-[var(--border)] bg-[var(--input)] p-2 text-[12px] text-[var(--muted-foreground)]">
            <TriangleAlert className="h-3.5 w-3.5" />
            body is not a flat object — fields mode only supports flat key/value pairs; switch to JSON for nested data.
          </div>
        )}
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_1fr_auto] items-center gap-2">
              <Input
                placeholder="key"
                value={r.key}
                onChange={(e) => {
                  const n = rows.slice();
                  n[i] = { ...n[i], key: e.target.value };
                  commitRows(n);
                }}
              />
              <Select
                value={r.type}
                onValueChange={(v) => {
                  const n = rows.slice();
                  n[i] = { ...n[i], type: v as Row["type"] };
                  commitRows(n);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">string</SelectItem>
                  <SelectItem value="number">number</SelectItem>
                  <SelectItem value="boolean">boolean</SelectItem>
                  <SelectItem value="null">null</SelectItem>
                </SelectContent>
              </Select>
              {r.type === "boolean" ? (
                <Select
                  value={r.value}
                  onValueChange={(v) => {
                    const n = rows.slice();
                    n[i] = { ...n[i], value: v };
                    commitRows(n);
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">true</SelectItem>
                    <SelectItem value="false">false</SelectItem>
                  </SelectContent>
                </Select>
              ) : r.type === "null" ? (
                <div className="meta px-2">null</div>
              ) : (
                <TemplateInput
                  value={r.value}
                  onChange={(v) => {
                    const n = rows.slice();
                    n[i] = { ...n[i], value: v };
                    commitRows(n);
                  }}
                  suggestions={suggestions}
                  placeholder={r.type === "number" ? "0" : 'value or {{input.x}}'}
                />
              )}
              <Button variant="ghost" size="icon" onClick={() => commitRows(rows.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => commitRows([...rows, { key: "", type: "string", value: "" }])}
          >
            <Plus className="h-3.5 w-3.5" /> Add field
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export function KvEditor({
  valueJsonText,
  onChange,
  suggestions,
}: {
  valueJsonText: string;
  onChange: (jsonText: string) => void;
  suggestions: string[];
}) {
  const [mode, setMode] = React.useState<"json" | "fields">("json");
  const [rows, setRows] = React.useState<{ k: string; v: string }[]>([]);
  const [flat, setFlat] = React.useState(true);

  const toFields = () => {
    try {
      const obj = JSON.parse(valueJsonText || "{}");
      if (obj == null || typeof obj !== "object" || Array.isArray(obj)) {
        setFlat(false);
        setRows([]);
      } else {
        const r: { k: string; v: string }[] = [];
        let ok = true;
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          if (typeof v !== "string") { ok = false; break; }
          r.push({ k, v });
        }
        setFlat(ok);
        setRows(ok ? r : []);
      }
      setMode("fields");
    } catch {
      setFlat(false);
      setRows([]);
      setMode("fields");
    }
  };
  const toJson = () => {
    const obj: Record<string, string> = {};
    for (const { k, v } of rows) if (k) obj[k] = v;
    onChange(JSON.stringify(obj, null, 2));
    setMode("json");
  };
  const commit = (n: { k: string; v: string }[]) => {
    setRows(n);
    const obj: Record<string, string> = {};
    for (const { k, v } of n) if (k) obj[k] = v;
    onChange(JSON.stringify(obj, null, 2));
  };

  return (
    <Tabs value={mode} onValueChange={(v) => (v === "fields" ? toFields() : toJson())}>
      <TabsList>
        <TabsTrigger value="json">JSON</TabsTrigger>
        <TabsTrigger value="fields">Fields</TabsTrigger>
      </TabsList>
      <TabsContent value="json" className="mt-3">
        <TemplateTextarea value={valueJsonText} onChange={onChange} suggestions={suggestions} minHeight="80px" />
      </TabsContent>
      <TabsContent value="fields" className="mt-3">
        {!flat && (
          <div className="mb-3 flex items-center gap-2 border border-[var(--border)] bg-[var(--input)] p-2 text-[12px] text-[var(--muted-foreground)]">
            <TriangleAlert className="h-3.5 w-3.5" />
            headers must be a flat object of string values — switch to JSON to edit.
          </div>
        )}
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                placeholder="header name"
                value={row.k}
                onChange={(e) => {
                  const n = rows.slice();
                  n[i] = { ...n[i], k: e.target.value };
                  commit(n);
                }}
              />
              <TemplateInput
                value={row.v}
                onChange={(v) => {
                  const n = rows.slice();
                  n[i] = { ...n[i], v };
                  commit(n);
                }}
                suggestions={suggestions}
                placeholder="value or {{input.x}}"
              />
              <Button variant="ghost" size="icon" onClick={() => commit(rows.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => commit([...rows, { k: "", v: "" }])}>
            <Plus className="h-3.5 w-3.5" /> Add header
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
