import { useConfigCreate } from "@/api/config/create";
import { useConfigDelete } from "@/api/config/delete";
import { useConfigList, type ConfigListDto } from "@/api/config/list";
import { useConfigUpdate } from "@/api/config/update";
import { AppPage } from "@/components/app-page";
import { ConfigManagementCard } from "@/components/config-management-card";
import { ConfigForm, type SingBoxConfig } from "@/components/config-form";
import { EmptyState } from "@/components/empty-state";
import { SkeletonGrid } from "@/components/skeleton-grid";
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
import { Button } from "@/components/ui/button";
import { extractErrorMessage } from "@/lib/error";
import {
  IconCubePlus,
  IconEdit,
  IconLink,
  IconCheck,
  IconTrash,
  IconCopy,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: configs, isLoading } = useConfigList();
  const createMutation = useConfigCreate();
  const updateMutation = useConfigUpdate();
  const deleteMutation = useConfigDelete();

  const [formOpen, setFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedUuid, setSelectedUuid] = useState("");
  const [initialData, setInitialData] = useState<Partial<SingBoxConfig>>();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    uuid: string;
    name: string;
  } | null>(null);

  const handleNewConfig = () => {
    setIsCreating(true);
    setSelectedUuid(uuidv4());
    setInitialData(undefined);
    setFormOpen(true);
  };

  const handleEditConfig = (config: ConfigListDto) => {
    setIsCreating(false);
    setSelectedUuid(config.uuid);
    // ConfigListDto 和 SingBoxConfig 结构相同（除了 uuid），可以直接传递
    setInitialData({
      name: config.name,
      description: config.description,
      log: config.log,
      dns: config.dns,
      inbounds: config.inbounds,
      route: config.route,
      experimental: config.experimental,
      ext_config: config.ext_config,
    });
    setFormOpen(true);
  };

  const handleCopyConfig = async (config: ConfigListDto) => {
    try {
      const newUuid = uuidv4();
      const payload = {
        uuid: newUuid,
        name: `${config.name}-复制`,
        description: config.description,
        log: config.log,
        dns: config.dns,
        inbounds: config.inbounds,
        route: config.route,
        experimental: config.experimental,
        ext_config: config.ext_config,
      };

      await createMutation.mutateAsync(payload);
      toast.success("Config copied successfully");
    } catch (error: unknown) {
      console.error("Failed to copy config:", error);
      const errorMessage = await extractErrorMessage(
        error,
        "Failed to copy config",
      );
      toast.error(errorMessage);
    }
  };

  const handleSaveConfig = async (data: SingBoxConfig) => {
    try {
      const payload = {
        uuid: selectedUuid,
        ...data,
      };

      if (isCreating) {
        await createMutation.mutateAsync(payload);
        toast.success("Config created successfully");
      } else {
        await updateMutation.mutateAsync(payload);
        toast.success("Config updated successfully");
      }

      setFormOpen(false);
    } catch (error: unknown) {
      console.error("Failed to save config:", error);
      const errorMessage = await extractErrorMessage(
        error,
        "Failed to save config",
      );
      toast.error(errorMessage);
    }
  };

  const handleDeleteConfig = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.uuid);
      toast.success("Config deleted successfully");
      setDeleteTarget(null);
    } catch (error: unknown) {
      console.error("Failed to delete config:", error);
      const errorMessage = await extractErrorMessage(
        error,
        "Failed to delete config",
      );
      toast.error(errorMessage);
    }
  };

  const copyDownloadLink = async (configId: string) => {
    try {
      const downloadUrl = `${window.location.origin}/download/${configId}`;

      // 优先尝试现代的 clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(downloadUrl);
      } else {
        // 兼容性方案：使用传统的 document.execCommand
        const textArea = document.createElement("textarea");
        textArea.value = downloadUrl;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error("execCommand failed");
        }
      }

      setCopiedId(configId);
      toast.success("Download URL copied to clipboard");

      // 2秒后清除复制状态
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("复制链接失败，请手动复制下载地址");
    }
  };

  return (
    <AppPage
      title="Config Management"
      description="Create and manage SingBox configurations by selecting from other configured modules"
      actions={
        <Button
          size="sm"
          onClick={handleNewConfig}
          className="gap-2 relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <IconCubePlus className="size-4" />
          New Config
        </Button>
      }
    >
      {isLoading ? (
        <SkeletonGrid />
      ) : !configs || configs.length === 0 ? (
        <EmptyState
          title="No configs configured"
          description="Create your first config to generate a complete SingBox configuration from your configured modules"
          actionLabel="Create Your First Config"
          onAction={handleNewConfig}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {configs.map((config, index) => (
            <ConfigManagementCard
              key={config.uuid}
              name={config.name}
              description={config.description}
              updatedAt={config.updated_at}
              dns={config.dns}
              inbounds={config.inbounds}
              route={config.route}
              onClick={() => handleEditConfig(config)}
              index={index}
              actions={
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyDownloadLink(config.uuid);
                    }}
                  >
                    {copiedId === config.uuid ? (
                      <IconCheck className="size-4 text-green-500" />
                    ) : (
                      <IconLink className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyConfig(config);
                    }}
                  >
                    <IconCopy className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditConfig(config);
                    }}
                  >
                    <IconEdit className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({
                        uuid: config.uuid,
                        name: config.name,
                      });
                    }}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}

      <ConfigForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveConfig}
        initialData={initialData}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除配置</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 "{deleteTarget?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfig}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppPage>
  );
}
