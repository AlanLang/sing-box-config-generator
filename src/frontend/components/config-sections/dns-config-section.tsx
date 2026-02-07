import { useDnsConfigList } from "@/api/dns-config/list";
import { useDnsList } from "@/api/dns/list";
import { useOutboundGroupOptions } from "@/api/outbound-group/options";
import { useRulesetList } from "@/api/ruleset/list";
import type { SingBoxConfig } from "@/components/config-form";
import {
	MultiSelectorDrawer,
	SelectorDrawer,
	type SelectorDrawerItem,
} from "@/components/selector-drawer";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	IconAlertCircle,
	IconArrowDown,
	IconArrowUp,
	IconCheck,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { useMemo } from "react";

type DnsServer = SingBoxConfig["dns"]["servers"][number];

interface DnsConfigSectionProps {
	config: string | undefined;
	onConfigChange: (value: string | undefined) => void;
	servers: DnsServer[];
	onServersChange: (value: DnsServer[]) => void;
	rules: SingBoxConfig["dns"]["rules"];
	onRulesChange: (value: SingBoxConfig["dns"]["rules"]) => void;
	final: string;
	onFinalChange: (value: string) => void;
	isValid: boolean;
}

export function DnsConfigSection({
	config,
	onConfigChange,
	servers,
	onServersChange,
	rules,
	onRulesChange,
	final: finalServer,
	onFinalChange,
	isValid,
}: DnsConfigSectionProps) {
	const { data: dnsConfigs, isLoading: dnsConfigsLoading } =
		useDnsConfigList();
	const { data: dnsServerList, isLoading: dnsServersLoading } = useDnsList();
	const { data: rulesets, isLoading: rulesetsLoading } = useRulesetList();
	const { data: outboundOptions, isLoading: outboundsLoading } =
		useOutboundGroupOptions();

	// 提取 server uuid 列表
	const serverUuids = useMemo(() => servers.map((s) => s.uuid), [servers]);

	// 过滤掉 filter 类型，构建 outbound SelectorDrawer items（带分组）
	const outboundDrawerItems: SelectorDrawerItem[] = useMemo(() => {
		if (!outboundOptions) return [];
		return outboundOptions
			.filter((option) => option.source !== "filter")
			.map((o) => ({
				value: o.uuid,
				title: o.label,
				description: o.type ? `(${o.type})` : undefined,
				group:
					o.source === "outbound_group" ? "Outbound Groups" : "Outbounds",
			}));
	}, [outboundOptions]);

	const handleServersChange = (newServerUuids: string[]) => {
		const removedUuids = serverUuids.filter(
			(s) => !newServerUuids.includes(s),
		);
		// 保留已有 server 的 detour 配置，新增的 server 默认无 detour
		const newServers: DnsServer[] = newServerUuids.map((uuid) => {
			const existing = servers.find((s) => s.uuid === uuid);
			return existing || { uuid };
		});
		onServersChange(newServers);
		for (const serverUuid of removedUuids) {
			if (finalServer === serverUuid) {
				onFinalChange("");
			}
		}
		if (rules && removedUuids.length > 0) {
			onRulesChange(
				rules.filter((rule) => !removedUuids.includes(rule.server)),
			);
		}
	};

	const handleServerDetourChange = (
		serverUuid: string,
		detour: string | undefined,
	) => {
		const newServers = servers.map((s) =>
			s.uuid === serverUuid ? { ...s, detour } : s,
		);
		onServersChange(newServers);
	};

	const handleMoveRule = (index: number, direction: "up" | "down") => {
		if (!rules) return;
		const newRules = [...rules];
		const targetIndex = direction === "up" ? index - 1 : index + 1;
		[newRules[index], newRules[targetIndex]] = [
			newRules[targetIndex],
			newRules[index],
		];
		onRulesChange(newRules);
	};

	const handleDeleteRule = (index: number) => {
		if (!rules) return;
		onRulesChange(rules.filter((_, i) => i !== index));
	};

	const handleAddRule = () => {
		const newRules = rules || [];
		onRulesChange([
			...newRules,
			{ rule_set: [], server: serverUuids[0] || "" },
		]);
	};

	const handleUpdateRule = (
		index: number,
		field: "rule_set" | "server",
		value: string[] | string,
	) => {
		if (!rules) return;
		const newRules = [...rules];
		if (field === "rule_set") {
			newRules[index].rule_set = value as string[];
		} else {
			newRules[index].server = value as string;
		}
		onRulesChange(newRules);
	};

	// 已选中的 server 列表，用于 rules 和 final
	const selectedServerItems =
		dnsServerList?.filter((s) => serverUuids.includes(s.uuid)) || [];

	return (
		<AccordionItem value="dns">
			<AccordionTrigger className="hover:no-underline">
				<div className="flex items-center gap-3">
					{isValid ? (
						<IconCheck className="size-5 text-green-500" />
					) : (
						<IconAlertCircle className="size-5 text-destructive" />
					)}
					<span className="font-medium">
						DNS Configuration
						<span className="text-destructive ml-1">*</span>
					</span>
					{servers.length > 0 && (
						<span className="text-sm text-muted-foreground ml-2">
							({servers.length} servers, {rules?.length || 0} rules)
						</span>
					)}
				</div>
			</AccordionTrigger>
			<AccordionContent>
				<div className="pt-4 space-y-6">
					{/* 1. 基础配置（可选） */}
					<div className="space-y-3">
						<div>
							<Label className="text-base">
								Base Configuration{" "}
								<span className="text-muted-foreground text-sm font-normal">
									(Optional)
								</span>
							</Label>
							<p className="text-sm text-muted-foreground mt-1">
								Select a base DNS configuration. Leave unselected for empty
								base config.
							</p>
						</div>

						{dnsConfigsLoading ? (
							<div className="text-sm text-muted-foreground">
								Loading DNS configs...
							</div>
						) : !dnsConfigs || dnsConfigs.length === 0 ? (
							<div className="p-4 border border-dashed rounded-lg text-center">
								<p className="text-sm text-muted-foreground">
									No DNS configs found. You can proceed without base
									configuration.
								</p>
							</div>
						) : (
							<SelectorDrawer
								drawerTitle="Select Base DNS Configuration"
								placeholder="Select a base configuration"
								items={dnsConfigs.map((c) => ({
									value: c.uuid,
									title: c.name,
									description: c.json,
								}))}
								value={config || ""}
								onSelect={(val) => onConfigChange(val || undefined)}
								noneOption={{
									title: "No base config",
									description: "Use empty base configuration",
								}}
							/>
						)}
					</div>

					{/* 2. DNS Servers（必选，多选） */}
					<div className="space-y-3">
						<div>
							<Label className="text-base">
								DNS Servers <span className="text-destructive">*</span>
							</Label>
							<p className="text-sm text-muted-foreground mt-1">
								Select at least one DNS server. You can optionally configure a
								detour for each server.
							</p>
						</div>

						{dnsServersLoading ? (
							<div className="text-sm text-muted-foreground">
								Loading DNS servers...
							</div>
						) : !dnsServerList || dnsServerList.length === 0 ? (
							<div className="p-4 border border-dashed rounded-lg text-center">
								<p className="text-sm text-destructive">
									No DNS servers found. Please create DNS servers first.
								</p>
							</div>
						) : (
							<MultiSelectorDrawer
								drawerTitle="Select DNS Servers"
								drawerDescription="Select one or more DNS servers."
								placeholder="Select DNS servers"
								items={dnsServerList.map((s) => ({
									value: s.uuid,
									title: s.name,
									description: s.json,
								}))}
								value={serverUuids}
								onChange={handleServersChange}
							/>
						)}
						{servers.length === 0 &&
							dnsServerList &&
							dnsServerList.length > 0 && (
								<p className="text-sm text-destructive">
									Please select at least one DNS server
								</p>
							)}

						{/* 每个选中 server 的 detour 配置 */}
						{servers.length > 0 && (
							<div className="space-y-2">
								{servers.map((server) => {
									const serverInfo = dnsServerList?.find(
										(s) => s.uuid === server.uuid,
									);
									return (
										<div
											key={server.uuid}
											className="flex items-center gap-3 p-3 border rounded-lg"
										>
											<span className="text-sm font-medium min-w-0 truncate flex-1">
												{serverInfo?.name || server.uuid}
											</span>
											<div className="w-48 sm:w-56 shrink-0">
												{outboundsLoading ? (
													<div className="text-sm text-muted-foreground">
														Loading...
													</div>
												) : (
													<SelectorDrawer
														drawerTitle={`Detour for ${serverInfo?.name || "DNS Server"}`}
														placeholder="No detour"
														items={outboundDrawerItems}
														value={server.detour || ""}
														onSelect={(val) =>
															handleServerDetourChange(
																server.uuid,
																val || undefined,
															)
														}
														noneOption={{
															title: "No detour",
															description:
																"DNS server will use direct connection",
														}}
													/>
												)}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>

					{/* 3. Rules 配置（可选） */}
					<div className="space-y-3">
						<div>
							<Label className="text-base">
								DNS Rules{" "}
								<span className="text-muted-foreground text-sm font-normal">
									(Optional)
								</span>
							</Label>
							<p className="text-sm text-muted-foreground mt-1">
								Configure DNS routing rules. Each rule maps rulesets to a
								specific DNS server.
							</p>
						</div>

						{servers.length === 0 ? (
							<div className="p-4 border border-dashed rounded-lg text-center">
								<p className="text-sm text-muted-foreground">
									Select DNS servers first to configure rules.
								</p>
							</div>
						) : (
							<div className="space-y-3">
								{rules?.map((rule, index) => {
									// 获取当前 rule 外的其他 rules 已使用的 rulesets
									const usedRulesets = rules
										.filter((_, i) => i !== index)
										.flatMap((r) => r.rule_set);

									return (
										<div
											key={index}
											className="p-4 border rounded-lg space-y-3"
										>
											<div className="flex items-center justify-between">
												<Label className="text-sm font-medium">
													Rule #{index + 1}
												</Label>
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="sm"
														disabled={index === 0}
														onClick={() => handleMoveRule(index, "up")}
														title="Move up"
													>
														<IconArrowUp className="size-4" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														disabled={index === rules.length - 1}
														onClick={() => handleMoveRule(index, "down")}
														title="Move down"
													>
														<IconArrowDown className="size-4" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleDeleteRule(index)}
														title="Delete rule"
													>
														<IconTrash className="size-4" />
													</Button>
												</div>
											</div>

											{/* Rulesets 选择 */}
											<div className="space-y-2">
												<Label className="text-sm">
													Rulesets <span className="text-destructive">*</span>
												</Label>
												{rulesetsLoading ? (
													<div className="text-sm text-muted-foreground">
														Loading rulesets...
													</div>
												) : !rulesets || rulesets.length === 0 ? (
													<div className="text-sm text-muted-foreground">
														No rulesets available
													</div>
												) : (
													<MultiSelectorDrawer
														drawerTitle={`Rule #${index + 1} - Rulesets`}
														drawerDescription="Select rulesets for this rule."
														placeholder="Select rulesets"
														items={rulesets.map((r) => ({
															value: r.uuid,
															title: r.name,
															description: r.json,
															disabled: usedRulesets.includes(r.uuid),
															disabledLabel: "Used",
														}))}
														value={rule.rule_set}
														onChange={(val) =>
															handleUpdateRule(index, "rule_set", val)
														}
													/>
												)}
											</div>

											{/* Server 选择 */}
											<div className="space-y-2">
												<Label className="text-sm">
													Target Server{" "}
													<span className="text-destructive">*</span>
												</Label>
												<SelectorDrawer
													drawerTitle={`Rule #${index + 1} - Target Server`}
													placeholder="Select a target server"
													items={selectedServerItems.map((s) => ({
														value: s.uuid,
														title: s.name,
														description: s.json,
													}))}
													value={rule.server}
													onSelect={(val) =>
														handleUpdateRule(index, "server", val)
													}
												/>
											</div>
										</div>
									);
								})}

								<Button
									variant="outline"
									size="sm"
									onClick={handleAddRule}
									className="w-full"
								>
									<IconPlus className="size-4 mr-2" />
									Add Rule
								</Button>
							</div>
						)}
					</div>

					{/* 4. Final 配置（必选） */}
					<div className="space-y-3">
						<div>
							<Label className="text-base">
								Final DNS Server <span className="text-destructive">*</span>
							</Label>
							<p className="text-sm text-muted-foreground mt-1">
								Select the fallback DNS server for unmatched queries.
							</p>
						</div>

						{servers.length === 0 ? (
							<div className="p-4 border border-dashed rounded-lg text-center">
								<p className="text-sm text-muted-foreground">
									Select DNS servers first to configure final server.
								</p>
							</div>
						) : (
							<SelectorDrawer
								drawerTitle="Select Final DNS Server"
								placeholder="Select a final DNS server"
								items={selectedServerItems.map((s) => ({
									value: s.uuid,
									title: s.name,
									description: s.json,
								}))}
								value={finalServer}
								onSelect={onFinalChange}
							/>
						)}
						{!finalServer && servers.length > 0 && (
							<p className="text-sm text-destructive">
								Please select a final DNS server
							</p>
						)}
					</div>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
