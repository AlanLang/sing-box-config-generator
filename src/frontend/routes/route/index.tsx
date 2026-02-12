import { createRoute } from "@/api/route/create";
import { useRouteDelete } from "@/api/route/delete";
import { useRouteList } from "@/api/route/list";
import { useRouteUpdate } from "@/api/route/update";
import { AppPage } from "@/components/app-page";
import { ConfigCard } from "@/components/config-card";
import { EmptyState } from "@/components/empty-state";
import { FocusEditor } from "@/components/focus-editor";
import { SkeletonGrid } from "@/components/skeleton-grid";
import { UsageWarningDialog } from "@/components/usage-warning-dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useResourceUsageCheck } from "@/api/usage-check";
import { IconCubePlus } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

export const Route = createFileRoute("/route/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [usageWarningOpen, setUsageWarningOpen] = useState(false);
  const [pendingDeleteUuid, setPendingDeleteUuid] = useState<string | null>(
    null,
  );
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { data: routes, refetch: refetchList, isLoading } = useRouteList();
  const selectedRoute = routes?.find((route) => route.uuid === selectedUuid);
  const updateRouteMutation = useRouteUpdate();
  const deleteRouteMutation = useRouteDelete();

  // 检查资源使用情况
  const { data: usageData } = useResourceUsageCheck(
    pendingDeleteUuid || "",
    "route",
    !!pendingDeleteUuid,
  );

  const [editName, setEditName] = useState("");
  const [editJson, setEditJson] = useState<string | undefined>(undefined);
  const [editUuid, setEditUuid] = useState("");

  useEffect(() => {
    if (selectedRoute && !isCreating) {
      setEditName(selectedRoute.name);
      setEditJson(selectedRoute.json);
      setEditUuid(selectedRoute.uuid);
    }
  }, [selectedRoute, isCreating]);

  useEffect(() => {
    if (selectedUuid === null && routes && routes.length > 0 && !isCreating) {
      setSelectedUuid(routes[0].uuid);
    }
  }, [routes, selectedUuid, isCreating]);

  // ESC to exit focus mode
  const handleExitFocus = useCallback(() => {
    setFocusMode(false);
    if (isCreating) {
      setIsCreating(false);
      // Reset to first route if available
      if (routes && routes.length > 0) {
        setSelectedUuid(routes[0].uuid);
      }
    }
  }, [isCreating, routes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusMode) {
        handleExitFocus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusMode, handleExitFocus]);

  const handleNewRoute = () => {
    setIsCreating(true);
    setSelectedUuid(null);
    setEditName("");
    setEditJson("{}");
    setEditUuid(uuidv4());
    setFocusMode(true);
  };

  const handleSave = async () => {
    if (!editJson) return;

    try {
      JSON.parse(editJson);

      if (isCreating) {
        // Create new route
        await createRoute({
          uuid: editUuid,
          name: editName,
          json: editJson,
        });
        toast.success("Route created successfully");
        setIsCreating(false);
        await refetchList();
        // Switch to the newly created route
        setSelectedUuid(editUuid);
      } else {
        // Update existing route
        if (!selectedUuid) return;
        await updateRouteMutation.mutateAsync({
          uuid: selectedUuid,
          name: editName,
          json: editJson,
        });
        toast.success("Route updated successfully");
        await refetchList();
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format");
      } else {
        console.error(error);
        toast.error(
          isCreating ? "Failed to create route" : "Failed to update route",
        );
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedUuid) return;

    // 触发使用情况检查
    setPendingDeleteUuid(selectedUuid);
  };

  // 监听使用情况检查结果
  useEffect(() => {
    if (pendingDeleteUuid && usageData) {
      if (usageData.is_used) {
        // 被使用，显示警告对话框
        setUsageWarningOpen(true);
        setPendingDeleteUuid(null);
      } else {
        // 未被使用，显示确认删除对话框
        setDeleteDialogOpen(true);
        setPendingDeleteUuid(null);
      }
    }
  }, [pendingDeleteUuid, usageData]);

  const handleConfirmDelete = async () => {
    if (!selectedUuid) return;
    try {
      await deleteRouteMutation.mutateAsync({
        uuid: selectedUuid,
      });
      toast.success("Route deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedUuid(null);
      setFocusMode(false);
      refetchList();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete route");
    }
  };

  return (
    <AppPage
      title="Route Configuration"
      description="Design and manage routing configuration for your sing-box infrastructure"
      actions={
        <Button
          size="sm"
          onClick={handleNewRoute}
          className="gap-2 relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <IconCubePlus className="size-4" />
          New Route
        </Button>
      }
    >
      {/* Loading State */}
      {isLoading ? (
        <SkeletonGrid />
      ) : /* Empty State */
      !routes || routes.length === 0 ? (
        <EmptyState
          title="No routes configured"
          description="Start building your network configuration by creating your first route. Define routing configuration, filters, and policies."
          actionLabel="Create Your First Route"
          onAction={handleNewRoute}
        />
      ) : (
        /* Grid View */
        <AnimatePresence mode="wait">
          {!focusMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6"
            >
              {routes.map((route, index) => {
                return (
                  <ConfigCard
                    key={route.uuid}
                    name={route.name}
                    jsonPreview={route.json}
                    onClick={() => {
                      setSelectedUuid(route.uuid);
                      setIsCreating(false);
                      setFocusMode(true);
                    }}
                    index={index}
                    uuid={route.uuid}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Focus Mode Editor - Outside conditional so it works even when no routes */}
      <FocusEditor
        isOpen={focusMode}
        isCreating={isCreating}
        name={editName}
        onNameChange={setEditName}
        json={editJson}
        onJsonChange={setEditJson}
        uuid={isCreating ? editUuid : selectedRoute?.uuid || ""}
        onClose={handleExitFocus}
        onSave={handleSave}
        onDelete={handleDelete}
        isSaving={updateRouteMutation.isPending}
        isDeleting={deleteRouteMutation.isPending}
        entityType="Route"
        deleteDialogOpen={false}
        onDeleteDialogChange={() => {}}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 Route</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 "{selectedRoute?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteRouteMutation.isPending}
            >
              {deleteRouteMutation.isPending ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 使用警告对话框 */}
      <UsageWarningDialog
        open={usageWarningOpen}
        onOpenChange={setUsageWarningOpen}
        itemName={selectedRoute?.name || ""}
        itemType="Route"
        usedByConfigs={usageData?.used_by_configs || []}
      />
    </AppPage>
  );
}
