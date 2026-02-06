import { useConfigCreate } from "@/api/config/create";
import { useConfigDelete } from "@/api/config/delete";
import { useConfigList } from "@/api/config/list";
import { useConfigUpdate } from "@/api/config/update";
import { useDnsConfigList } from "@/api/dns-config/list";
import { useDnsList } from "@/api/dns/list";
import { useExperimentalList } from "@/api/experimental/list";
import { useInboundList } from "@/api/inbound/list";
import { useLogList } from "@/api/log/list";
import { useOutboundGroupOptions } from "@/api/outbound-group/options";
import { useRouteList } from "@/api/route/list";
import { AppPage } from "@/components/app-page";
import { ConfigForm, type SingBoxConfig } from "@/components/config-form";
import { ConfigRow } from "@/components/config-row";
import { EmptyState } from "@/components/empty-state";
import { SkeletonGrid } from "@/components/skeleton-grid";
import { Button } from "@/components/ui/button";
import { extractErrorMessage } from "@/lib/error";
import { IconCubePlus } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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

  // 查询所有模块数据用于显示名称
  const { data: logs } = useLogList();
  const { data: dnsConfigs } = useDnsConfigList();
  const { data: dnsServers } = useDnsList();
  const { data: inbounds } = useInboundList();
  const { data: routes } = useRouteList();
  const { data: outboundOptions } = useOutboundGroupOptions();
  const { data: experimentals } = useExperimentalList();

  // 创建 uuid 到名称的映射
  const logMap = useMemo(
    () => new Map(logs?.map((item) => [item.uuid, item.name]) || []),
    [logs],
  );
  const dnsConfigMap = useMemo(
    () => new Map(dnsConfigs?.map((item) => [item.uuid, item.name]) || []),
    [dnsConfigs],
  );
  const dnsServerMap = useMemo(
    () => new Map(dnsServers?.map((item) => [item.uuid, item.name]) || []),
    [dnsServers],
  );
  const inboundMap = useMemo(
    () => new Map(inbounds?.map((item) => [item.uuid, item.name]) || []),
    [inbounds],
  );
  const routeMap = useMemo(
    () => new Map(routes?.map((item) => [item.uuid, item.name]) || []),
    [routes],
  );
  const outboundMap = useMemo(
    () =>
      new Map(outboundOptions?.map((item) => [item.uuid, item.label]) || []),
    [outboundOptions],
  );
  const experimentalMap = useMemo(
    () => new Map(experimentals?.map((item) => [item.uuid, item.name]) || []),
    [experimentals],
  );

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
        <div className="space-y-3">
          {configs.map((config, index) => (
            <ConfigRow
              key={config.uuid}
              config={config}
              index={index}
              onEdit={() => handleEditConfig(config)}
              onDelete={() => handleDeleteConfig(config.uuid)}
              logName={logMap.get(config.log)}
              dnsConfigName={
                config.dns.config
                  ? dnsConfigMap.get(config.dns.config)
                  : undefined
              }
              dnsServerNames={
                config.dns.servers
                  .map((uuid) => dnsServerMap.get(uuid))
                  .filter(Boolean) as string[]
              }
              inboundNames={
                config.inbounds
                  .map((uuid) => inboundMap.get(uuid))
                  .filter(Boolean) as string[]
              }
              routeConfigName={
                config.route.config
                  ? routeMap.get(config.route.config)
                  : undefined
              }
              routeFinalName={outboundMap.get(config.route.final)}
              experimentalName={
                config.experimental
                  ? experimentalMap.get(config.experimental)
                  : undefined
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
