import { createFilter } from "@/api/filter/create";
import { useFilterDelete } from "@/api/filter/delete";
import { useFilterList } from "@/api/filter/list";
import { useFilterUpdate } from "@/api/filter/update";
import { AppPage } from "@/components/app-page";
import { ConfigCard } from "@/components/config-card";
import { EmptyState } from "@/components/empty-state";
import { SkeletonGrid } from "@/components/skeleton-grid";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { IconFilter, IconTrash } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

export const Route = createFileRoute("/subscribe/filter/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: filters, refetch: refetchList, isLoading } = useFilterList();
  const selectedFilter = filters?.find(
    (filter) => filter.uuid === selectedUuid,
  );
  const updateFilterMutation = useFilterUpdate();
  const deleteFilterMutation = useFilterDelete();

  const [editName, setEditName] = useState("");
  const [editFilterType, setEditFilterType] = useState<"simple" | "regex">(
    "simple",
  );
  const [editPattern, setEditPattern] = useState("");
  const [editUuid, setEditUuid] = useState("");

  useEffect(() => {
    if (selectedFilter && !isCreating) {
      setEditName(selectedFilter.name);
      setEditFilterType(selectedFilter.filter_type);
      setEditPattern(selectedFilter.pattern);
      setEditUuid(selectedFilter.uuid);
    }
  }, [selectedFilter, isCreating]);

  const handleNewFilter = () => {
    setIsCreating(true);
    setSelectedUuid(null);
    setEditName("");
    setEditFilterType("simple");
    setEditPattern("");
    setEditUuid(uuidv4());
    setEditorOpen(true);
  };

  const handleEditFilter = (uuid: string) => {
    setIsCreating(false);
    setSelectedUuid(uuid);
    setEditorOpen(true);
  };

  const handleCloseEditor = useCallback(() => {
    setEditorOpen(false);
    if (isCreating) {
      setIsCreating(false);
      setSelectedUuid(null);
    }
  }, [isCreating]);

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    if (!editPattern.trim()) {
      toast.error("Pattern cannot be empty");
      return;
    }

    try {
      if (isCreating) {
        await createFilter({
          uuid: editUuid,
          name: editName,
          filter_type: editFilterType,
          pattern: editPattern,
        });
        toast.success("Filter created successfully");
        setIsCreating(false);
        await refetchList();
        setSelectedUuid(editUuid);
      } else {
        if (!selectedUuid) return;
        await updateFilterMutation.mutateAsync({
          uuid: selectedUuid,
          name: editName,
          filter_type: editFilterType,
          pattern: editPattern,
        });
        toast.success("Filter updated successfully");
        await refetchList();
      }
      setEditorOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(
        isCreating ? "Failed to create filter" : "Failed to update filter",
      );
    }
  };

  const handleDelete = async () => {
    if (!selectedUuid) return;
    try {
      await deleteFilterMutation.mutateAsync({
        uuid: selectedUuid,
      });
      toast.success("Filter deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedUuid(null);
      setEditorOpen(false);
      refetchList();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete filter");
    }
  };

  return (
    <AppPage
      title="Filter Configuration"
      description="Create filters to match outbound names using simple patterns or regular expressions"
      actions={
        <Button
          size="sm"
          onClick={handleNewFilter}
          className="gap-2 relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <IconFilter className="size-4" />
          New Filter
        </Button>
      }
    >
      {/* Loading State */}
      {isLoading ? (
        <SkeletonGrid />
      ) : /* Empty State */
      !filters || filters.length === 0 ? (
        <EmptyState
          title="No filters configured"
          description="Start filtering your outbound connections by creating your first filter. Use simple patterns (港|香港) or regular expressions."
          actionLabel="Create Your First Filter"
          onAction={handleNewFilter}
        />
      ) : (
        /* Grid View */
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6"
          >
            {filters.map((filter, index) => {
              const preview = JSON.stringify(
                {
                  type: filter.filter_type,
                  pattern:
                    filter.pattern.length > 50
                      ? filter.pattern.substring(0, 50) + "..."
                      : filter.pattern,
                },
                null,
                2,
              );
              return (
                <ConfigCard
                  key={filter.uuid}
                  name={filter.name}
                  jsonPreview={preview}
                  onClick={() => handleEditFilter(filter.uuid)}
                  index={index}
                  uuid={filter.uuid}
                />
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Filter Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={handleCloseEditor}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? "Create Filter" : "Edit Filter"}
            </DialogTitle>
            <DialogDescription>
              {editFilterType === "simple"
                ? "Simple pattern: use | to separate multiple keywords (e.g., 港|香港|HK)"
                : "Regular expression: use regex syntax to match outbound names"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter filter name"
                className="dark:bg-background"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filter-type">Filter Type</Label>
              <Select
                value={editFilterType}
                onValueChange={(value) =>
                  setEditFilterType(value as "simple" | "regex")
                }
              >
                <SelectTrigger id="filter-type" className="dark:bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple (使用 | 分隔)</SelectItem>
                  <SelectItem value="regex">Regular Expression</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pattern">Pattern</Label>
              <Textarea
                id="pattern"
                value={editPattern}
                onChange={(e) => setEditPattern(e.target.value)}
                placeholder={
                  editFilterType === "simple" ? "港|香港|HK" : "^(香港|HK).*"
                }
                className="font-mono text-sm min-h-[100px] dark:bg-background"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center">
            <div>
              {!isCreating && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={deleteFilterMutation.isPending}
                  className="gap-2"
                >
                  <IconTrash className="size-4" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCloseEditor}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateFilterMutation.isPending}
              >
                {updateFilterMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Filter</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this filter? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteFilterMutation.isPending}
            >
              {deleteFilterMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppPage>
  );
}
