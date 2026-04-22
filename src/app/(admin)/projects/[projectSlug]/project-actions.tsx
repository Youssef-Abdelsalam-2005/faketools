"use client";
import * as React from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { renameProject, deleteProject } from "@/lib/actions/projects";

export function ProjectActions({ projectId, name }: { projectId: string; name: string }) {
  const onRename = () => {
    const next = prompt("Rename project", name);
    if (next && next !== name) renameProject(projectId, next);
  };
  const onDelete = () => {
    if (confirm("Delete this project and all its endpoints?")) deleteProject(projectId);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDelete} className="text-[var(--destructive)]">Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
