"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Undo2, X, Send } from "lucide-react";
import { AsciiSpinner } from "@/components/ascii/AsciiSpinner";
import type { InputField, Rule } from "@/lib/db/schema";
import type { Origin } from "@/components/change-badge";

export type EditorState = {
  name: string;
  method: string;
  enabled: boolean;
  requireApiKey: boolean;
  authHeaderName: string;
  authScheme: string;
  inputMode: string;
  validateInput: boolean;
  statusCode: number;
  delayMode: string;
  delayMs: number;
  delayMinMs: number;
  delayMaxMs: number;
  outputText: string;
  headersText: string;
  sampleText: string;
  fields: InputField[];
  rules: Rule[];
};

export type FullSnapshot = { state: EditorState; origins: Partial<Record<string, Origin>> };

function toEndpointLogical(s: EditorState) {
  let sample: unknown = undefined;
  try { sample = JSON.parse(s.sampleText || "{}"); } catch {}
  let output: unknown = {};
  try { output = JSON.parse(s.outputText || "{}"); } catch {}
  let headers: Record<string, string> = {};
  try { headers = JSON.parse(s.headersText || "{}"); } catch {}
  return {
    name: s.name, method: s.method, enabled: s.enabled,
    requireApiKey: s.requireApiKey, authHeaderName: s.authHeaderName, authScheme: s.authScheme,
    inputMode: s.inputMode, validateInput: s.validateInput, statusCode: s.statusCode,
    delayMode: s.delayMode, delayMs: s.delayMs, delayMinMs: s.delayMinMs, delayMaxMs: s.delayMaxMs,
    inputSchema: { fields: s.fields, sample },
    outputTemplate: output, responseHeaders: headers,
    rules: s.rules,
  };
}

function applyPatch(s: EditorState, patch: Record<string, any>): EditorState {
  const next: EditorState = { ...s };
  const simple: (keyof EditorState)[] = [
    "name", "method", "enabled", "requireApiKey", "authHeaderName", "authScheme",
    "inputMode", "validateInput", "statusCode", "delayMode", "delayMs", "delayMinMs", "delayMaxMs",
  ];
  for (const k of simple) if (patch[k] !== undefined) (next as any)[k] = patch[k];
  if (patch.outputTemplate !== undefined) next.outputText = JSON.stringify(patch.outputTemplate, null, 2);
  if (patch.responseHeaders !== undefined) next.headersText = JSON.stringify(patch.responseHeaders, null, 2);
  if (patch.inputSchema !== undefined) {
    if (Array.isArray(patch.inputSchema.fields)) next.fields = patch.inputSchema.fields;
    if (patch.inputSchema.sample !== undefined) next.sampleText = JSON.stringify(patch.inputSchema.sample, null, 2);
  }
  if (Array.isArray(patch.rules)) next.rules = patch.rules;
  return next;
}

export function AIAssistant({
  snapshot,
  restore,
  setOriginsAI,
}: {
  snapshot: () => FullSnapshot;
  restore: (s: FullSnapshot) => void;
  setOriginsAI: (keys: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastSummary, setLastSummary] = React.useState<string | null>(null);
  const [lastPrev, setLastPrev] = React.useState<FullSnapshot | null>(null);

  const run = async () => {
    if (!message.trim()) return;
    setError(null);
    setLoading(true);
    const prev = snapshot();
    try {
      const res = await fetch("/api/ai/edit-endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: toEndpointLogical(prev.state), message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ai call failed");
      const patch = json.patch ?? {};
      if (!patch || Object.keys(patch).length === 0) {
        setError(json.summary || "model returned no changes");
        return;
      }
      const nextState = applyPatch(prev.state, patch);
      restore({ state: nextState, origins: prev.origins });
      setOriginsAI(Object.keys(patch));
      setLastPrev(prev);
      setLastSummary(json.summary || "edits applied");
      setMessage("");
    } catch (e: any) {
      setError(e.message || "ai call failed");
    } finally {
      setLoading(false);
    }
  };

  const undo = () => {
    if (!lastPrev) return;
    restore(lastPrev);
    setLastPrev(null);
    setLastSummary(null);
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center border border-[var(--border)] bg-[var(--card)] shadow-md hover:bg-[var(--border)]/40"
          aria-label="Open AI assistant"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[380px] border border-[var(--border)] bg-[var(--card)] shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="meta">assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 p-3">
            {lastSummary && (
              <div className="flex items-center justify-between border border-amber-400/60 bg-amber-400/10 px-3 py-2">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="mono border border-amber-400/60 px-1 py-[1px] text-[9px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">AI</span>
                  <span>{lastSummary}</span>
                </div>
                <Button variant="outline" size="sm" onClick={undo}>
                  <Undo2 className="h-3.5 w-3.5" /> Undo
                </Button>
              </div>
            )}
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  run();
                }
              }}
              placeholder={'e.g. "rename user_id to tenant_id everywhere" or "add a rule that returns 404 when input.id is missing"'}
              className="min-h-[80px]"
              disabled={loading}
            />
            {error && <div className="text-[12px] text-[var(--destructive)]">{error}</div>}
            <div className="flex items-center justify-between">
              <span className="meta">⌘/ctrl + enter</span>
              <div className="flex items-center gap-2">
                {loading && <AsciiSpinner size={5} />}
                <Button onClick={run} disabled={loading || !message.trim()} size="sm">
                  <Send className="h-3.5 w-3.5" /> Send
                </Button>
              </div>
            </div>
            <div className="meta">
              AI edits stage in the editor and are tagged <span className="mono border border-amber-400/60 px-1 text-amber-700 dark:text-amber-300">AI</span>. Review, then Save to persist. Your edits show as <span className="mono border border-sky-500/60 px-1 text-sky-700 dark:text-sky-300">YOU</span>.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
