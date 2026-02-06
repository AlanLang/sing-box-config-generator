import { useConfigCreate } from "@/api/config/create";
import { useConfigDelete } from "@/api/config/delete";
import { useConfigList } from "@/api/config/list";
import { useConfigUpdate } from "@/api/config/update";
import { AppPage } from "@/components/app-page";
import { ConfigCard } from "@/components/config-card";
import { ConfigForm, type SingBoxConfig } from "@/components/config-form";
import { EmptyState } from "@/components/empty-state";
import { SkeletonGrid } from "@/components/skeleton-grid";
import { Button } from "@/components/ui/button";
import { extractErrorMessage } from "@/lib/error";
import { IconCubePlus, IconEdit, IconTrash } from "@tabler/icons-react";
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

  const handleNewConfig = () => {
    setIsCreating(true);
    setSelectedUuid(uuidv4());
    setInitialData(undefined);
    setFormOpen(true);
  };

  const handleEditConfig = (config: SingBoxConfig & { uuid: string }) => {
    setIsCreating(false);
    setSelectedUuid(config.uuid);
    setInitialData(config);
    setFormOpen(true);
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
    } catch (error: any) {
      console.error("Failed to save config:", error);
      const errorMessage = await extractErrorMessage(
        error,
        "Failed to save config",
      );
      toast.error(errorMessage);
    }
  };

  const handleDeleteConfig = async (uuid: string) => {
    try {
      await deleteMutation.mutateAsync(uuid);
      toast.success("Config deleted successfully");
    } catch (error: any) {
      console.error("Failed to delete config:", error);
      const errorMessage = await extractErrorMessage(
        error,
        "Failed to delete config",
      );
      toast.error(errorMessage);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map((config, index) => (
            <ConfigCard
              key={config.uuid}
              uuid={config.uuid}
              name={config.name}
              jsonPreview={JSON.stringify(
                {
                  log: config.log,
                  dns: config.dns,
                  inbounds: config.inbounds,
                  route: config.route,
                  experimental: config.experimental,
                },
                null,
                2,
              )}
              onClick={() => handleEditConfig(config)}
              index={index}
              actions={
                <>
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
                      handleDeleteConfig(config.uuid);
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
    </AppPage>
  );
}
