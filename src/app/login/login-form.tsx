"use client";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AsciiSpinner } from "@/components/ascii/AsciiSpinner";

export function LoginForm({ next, error }: { next?: string; error?: string }) {
  const [pending, setPending] = React.useState(false);
  return (
    <form
      action="/api/auth/login"
      method="post"
      onSubmit={() => setPending(true)}
      className="space-y-4"
    >
      <input type="hidden" name="next" value={next ?? "/projects"} />
      <div>
        <label className="meta mb-2 block">password</label>
        <Input type="password" name="password" required autoFocus />
      </div>
      {error && <div className="text-[12px] text-[var(--destructive)]">invalid password</div>}
      <div className="flex items-center justify-between pt-2">
        <Button type="submit" disabled={pending}>
          Enter System
        </Button>
        {pending && <AsciiSpinner />}
      </div>
    </form>
  );
}
