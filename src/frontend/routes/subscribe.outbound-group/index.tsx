import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { Button } from "@/components/ui/button";
import { ConfigCard } from "@/components/config-card";
import { EmptyState } from "@/components/empty-state";
import { SkeletonGrid } from "@/components/skeleton-grid";
import { OutboundGroupEditor } from "@/components/outbound-group-editor";
import { useOutboundGroupList } from "@/api/outbound-group/list";
import { useOutboundGroupUpdate } from "@/api/outbound-group/update";
import { useOutboundGroupDelete } from "@/api/outbound-group/delete";
import {
  createOutboundGroup,
  outboundGroupCreateSchema,
} from "@/api/outbound-group/create";
import type { GroupType, OutboundGroupDto } from "@/api/outbound-group/types";

export const Route = createFileRoute("/subscribe/outbound-group/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: groups, refetch, isLoading } = useOutboundGroupList();
  const updateMutation = useOutboundGroupUpdate();
  const deleteMutation = useOutboundGroupDelete();

  const [focusMode, setFocusMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedUuid, setSelectedUuid] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form state
  const [editName, setEditName] = useState("");
  const [editGroupType, setEditGroupType] = useState<GroupType>("selector");
  const [editOutbounds, setEditOutbounds] = useState<string[]>([]);
  const [editDefault, setEditDefault] = useState("");
  const [editUrl, setEditUrl] = useState(
    "https://www.gstatic.com/generate_204",
  );
  const [editInterval, setEditInterval] = useState("3m");
  const [editTolerance, setEditTolerance] = useState(50);
  const [editIdleTimeout, setEditIdleTimeout] = useState("30m");
  const [editInterrupt, setEditInterrupt] = useState(false);

  const handleNew = () => {
    setIsCreating(true);
    setSelectedUuid(uuidv4());
    setEditName("");
    setEditGroupType("selector");
    setEditOutbounds([]);
    setEditDefault("");
    setEditUrl("https://www.gstatic.com/generate_204");
    setEditInterval("3m");
    setEditTolerance(50);
    setEditIdleTimeout("30m");
    setEditInterrupt(false);
    setFocusMode(true);
  };

  const handleEdit = (group: OutboundGroupDto) => {
    setIsCreating(false);
    setSelectedUuid(group.uuid);
    setEditName(group.name);
    setEditGroupType(group.group_type);
    setEditOutbounds(group.outbounds || []);
    setEditDefault(group.default || "");
    setEditUrl(group.url || "https://www.gstatic.com/generate_204");
    setEditInterval(group.interval || "3m");
    setEditTolerance(group.tolerance || 50);
    setEditIdleTimeout(group.idle_timeout || "30m");
    setEditInterrupt(group.interrupt_exist_connections || false);
    setFocusMode(true);
  };

  const handleClose = () => {
    setFocusMode(false);
  };

  const handleSave = async () => {
    try {
      const data = {
        name: editName,
        group_type: editGroupType,
        outbounds: editOutbounds,
        default:
          editGroupType === "selector" ? editDefault || undefined : undefined,
        url: editGroupType === "urltest" ? editUrl || undefined : undefined,
        interval:
          editGroupType === "urltest" ? editInterval || undefined : undefined,
        tolerance: editGroupType === "urltest" ? editTolerance : undefined,
        idle_timeout:
          editGroupType === "urltest"
            ? editIdleTimeout || undefined
            : undefined,
        interrupt_exist_connections: editInterrupt,
      };

      // Validate
      const validation = outboundGroupCreateSchema.safeParse(data);
      if (!validation.success) {
        const firstError = validation.error.issues?.[0];
        toast.error(firstError?.message || "Validation failed");
        console.error("Validation errors:", validation.error.issues);
        return;
      }

      if (isCreating) {
        await createOutboundGroup(selectedUuid, validation.data);
        toast.success("Outbound group created successfully");
      } else {
        await updateMutation.mutateAsync({
          uuid: selectedUuid,
          data: validation.data,
        });
        toast.success("Outbound group updated successfully");
      }

      await refetch();
      setFocusMode(false);
    } catch (error) {
      console.error("Failed to save outbound group:", error);
      toast.error(
        `Failed to ${isCreating ? "create" : "update"} outbound group`,
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(selectedUuid);
      toast.success("Outbound group deleted successfully");
      setFocusMode(false);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete outbound group:", error);
      toast.error("Failed to delete outbound group");
    }
  };

  return (
    <AppPage
      title="Outbound Group Configuration"
      description="Manage selector and URL test outbound groups"
      actions={
        <Button onClick={handleNew} size="sm">
          New Group
        </Button>
      }
    >
      {isLoading ? (
        <SkeletonGrid />
      ) : groups?.length === 0 ? (
        <EmptyState
          title="No outbound groups"
          description="Create your first outbound group to get started"
          action={
            <Button onClick={handleNew} size="lg">
              New Group
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groups?.map((group, index) => {
            // Create a preview object for the card
            const preview = JSON.stringify(
              {
                type: group.group_type,
                outbounds: group.name,
                tag: group.name,
              },
              null,
              2,
            );
            return (
              <ConfigCard
                key={group.uuid}
                name={group.name}
                jsonPreview={preview}
                onClick={() => handleEdit(group)}
                index={index}
                uuid={group.uuid}
              />
            );
          })}
        </div>
      )}

      <OutboundGroupEditor
        isOpen={focusMode}
        isCreating={isCreating}
        name={editName}
        onNameChange={setEditName}
        groupType={editGroupType}
        onGroupTypeChange={setEditGroupType}
        outbounds={editOutbounds}
        onOutboundsChange={setEditOutbounds}
        defaultOutbound={editDefault}
        onDefaultOutboundChange={setEditDefault}
        url={editUrl}
        onUrlChange={setEditUrl}
        interval={editInterval}
        onIntervalChange={setEditInterval}
        tolerance={editTolerance}
        onToleranceChange={setEditTolerance}
        idleTimeout={editIdleTimeout}
        onIdleTimeoutChange={setEditIdleTimeout}
        interruptExisting={editInterrupt}
        onInterruptExistingChange={setEditInterrupt}
        uuid={selectedUuid}
        onClose={handleClose}
        onSave={handleSave}
        onDelete={handleDelete}
        isSaving={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        deleteDialogOpen={deleteDialogOpen}
        onDeleteDialogChange={setDeleteDialogOpen}
      />
    </AppPage>
  );
}
