"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { createEndpoint } from "@/lib/actions/endpoints";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];

export function NewEndpointDialog({ projectSlug }: { projectSlug: string }) {
  const [open, setOpen] = React.useState(false);
  const [method, setMethod] = React.useState("POST");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New endpoint
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New endpoint</DialogTitle>
        </DialogHeader>
        <form action={createEndpoint.bind(null, projectSlug)} className="space-y-4">
          <div>
            <label className="meta mb-1 block">name</label>
            <Input name="name" required autoFocus placeholder="get-customer" />
          </div>
          <div>
            <label className="meta mb-1 block">method</label>
            <input type="hidden" name="method" value={method} />
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
