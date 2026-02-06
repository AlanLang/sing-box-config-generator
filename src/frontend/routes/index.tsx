import { AppPage } from "@/components/app-page";
import { ConfigForm, type ConfigFormData } from "@/components/config-form";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { IconCubePlus } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [formOpen, setFormOpen] = useState(false);

  const handleNewConfig = () => {
    setFormOpen(true);
  };

  const handleSaveConfig = (data: ConfigFormData) => {
    // TODO: 实现保存逻辑
    console.log("Save config:", data);
    toast.success("Config saved successfully");
    setFormOpen(false);
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
      <EmptyState
        title="No configs configured"
        description="Create your first config to generate a complete SingBox configuration from your configured modules"
        actionLabel="Create Your First Config"
        onAction={handleNewConfig}
      />

      <ConfigForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveConfig}
      />
    </AppPage>
  );
}
