import { type BackupCreateDto, createBackup } from "@/api/backup/create";
import { useCurrentConfigHash } from "@/api/backup/current-hash";
import { useBackupDelete } from "@/api/backup/delete";
import { type BackupListDto, useBackupList } from "@/api/backup/list";
import { AppPage } from "@/components/app-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  IconArchive,
  IconCheck,
  IconDownload,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

export const Route = createFileRoute("/backup/")({
  component: RouteComponent,
});

function formatDateTime(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function RouteComponent() {
  const { data: backups, refetch, isLoading } = useBackupList();
  const { data: hashData, refetch: refetchHash } = useCurrentConfigHash();
  const deleteBackupMutation = useBackupDelete();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BackupListDto | null>(null);

  const currentHash = hashData?.content_hash;
  const hasMatchingBackup = backups?.some(
    (b) => b.content_hash && b.content_hash === currentHash,
  );

  const handleOpenCreate = () => {
    setName(formatDateTime());
    setDescription("");
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a backup name");
      return;
    }

    setCreating(true);
    try {
      const dto: BackupCreateDto = {
        uuid: uuidv4(),
        name: name.trim(),
        description: description.trim(),
      };
      await createBackup(dto);
      toast.success("Backup created successfully");
      setCreateOpen(false);
      refetch();
      refetchHash();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create backup");
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = (backup: BackupListDto) => {
    window.open(`/api/backup/download/${backup.uuid}`, "_blank");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBackupMutation.mutateAsync({ uuid: deleteTarget.uuid });
      toast.success("Backup deleted successfully");
      setDeleteTarget(null);
      refetch();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete backup");
    }
  };

  return (
    <AppPage
      title="Backup"
      description="Create and manage backups of all your configuration data"
      actions={
        hasMatchingBackup ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" disabled className="gap-2">
                <IconCheck className="size-4" />
                Already Backed Up
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Current configuration already has a matching backup
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="gap-2 relative overflow-hidden group"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <IconPlus className="size-4" />
            New Backup
          </Button>
        )
      }
    >
      {isLoading ? (
        <BackupSkeleton />
      ) : !backups || backups.length === 0 ? (
        <BackupEmptyState onAction={handleOpenCreate} />
      ) : (
        <div className="flex flex-col gap-3 pb-6">
          {backups.map((backup) => (
            <BackupCard
              key={backup.uuid}
              backup={backup}
              isCurrent={
                !!currentHash &&
                !!backup.content_hash &&
                backup.content_hash === currentHash
              }
              onDownload={() => handleDownload(backup)}
              onDelete={() => setDeleteTarget(backup)}
            />
          ))}
        </div>
      )}

      {/* Create Backup Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Backup</DialogTitle>
            <DialogDescription>
              Create a backup of all current configuration data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="backup-name">Name</Label>
              <Input
                id="backup-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Backup name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="backup-desc">Description (optional)</Label>
              <Textarea
                id="backup-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this backup"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create Backup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Backup</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete backup "{deleteTarget?.name}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteBackupMutation.isPending}
            >
              {deleteBackupMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppPage>
  );
}

function BackupCard({
  backup,
  isCurrent,
  onDownload,
  onDelete,
}: {
  backup: BackupListDto;
  isCurrent: boolean;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 transition-all hover:border-border ${
        isCurrent
          ? "border-emerald-500/50 bg-gradient-to-br from-emerald-50/50 via-card to-emerald-50/20 dark:from-emerald-950/20 dark:to-emerald-950/5"
          : "border-border/60 bg-gradient-to-br from-card via-card to-muted/20"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`shrink-0 size-10 rounded-lg flex items-center justify-center ${
              isCurrent ? "bg-emerald-500/15" : "bg-primary/10"
            }`}
          >
            {isCurrent ? (
              <IconCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <IconArchive className="size-5 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate">{backup.name}</h3>
              {isCurrent && (
                <Badge
                  variant="secondary"
                  className="shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                >
                  Current
                </Badge>
              )}
            </div>
            {backup.description && (
              <p className="text-sm text-muted-foreground truncate">
                {backup.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span>{formatDate(backup.created_at)}</span>
              <span>{formatFileSize(backup.file_size)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end shrink-0">
          <Button size="sm" variant="outline" onClick={onDownload}>
            <IconDownload className="size-4" />
            <span className="sm:inline hidden">Download</span>
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete}>
            <IconTrash className="size-4" />
            <span className="sm:inline hidden">Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function BackupEmptyState({ onAction }: { onAction: () => void }) {
  return (
    <div className="min-h-[calc(100vh-240px)] flex items-center justify-center">
      <div className="text-center max-w-lg space-y-6">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-3xl rounded-full" />
          <div className="relative bg-gradient-to-br from-background to-muted border-2 border-border/50 rounded-3xl p-12">
            <IconArchive
              className="size-20 mx-auto text-muted-foreground opacity-40"
              strokeWidth={1.5}
            />
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-bold tracking-tight">No backups yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
            Create a backup to save all your current configuration data. Backups
            include all modules and can be downloaded as archive files.
          </p>
        </div>
        <Button
          size="lg"
          onClick={onAction}
          className="gap-2 relative overflow-hidden group mt-4"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          Create Your First Backup
        </Button>
      </div>
    </div>
  );
}

function BackupSkeleton() {
  return (
    <div className="flex flex-col gap-3 pb-6">
      {Array.from({ length: 3 }, (_, i) => i).map((id) => (
        <div
          key={id}
          className="rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/20 p-4 sm:p-5 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-muted/50" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted/50 rounded w-1/3" />
              <div className="h-3 bg-muted/40 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
