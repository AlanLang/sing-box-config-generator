import { useRouteList } from "@/api/route/list";
import { useRulesetOptions } from "@/api/ruleset/options";
import { useOutboundGroupOptions } from "@/api/outbound-group/options";
import { useDnsList } from "@/api/dns/list";
import type { SingBoxConfig } from "@/components/config-form";
import { SelectableCard } from "@/components/selectable-card";
import {
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

interface RouteConfigSectionProps {
	config: string | undefined;
	onConfigChange: (value: string | undefined) => void;
	rules: SingBoxConfig["route"]["rules"];
	onRulesChange: (value: SingBoxConfig["route"]["rules"]) => void;
	final: string;
	onFinalChange: (value: string) => void;
	defaultDomainResolver: string | undefined;
	onDefaultDomainResolverChange: (value: string | undefined) => void;
	dnsServers: string[]; // DNS Configuration 中选中的 DNS servers
	isValid: boolean;
}

export function RouteConfigSection({
	config,
	onConfigChange,
	rules,
	onRulesChange,
	final,
	onFinalChange,
	defaultDomainResolver,
	onDefaultDomainResolverChange,
	dnsServers,
	isValid,
}: RouteConfigSectionProps) {
	const { data: routes, isLoading: routesLoading } = useRouteList();
	const { data: rulesetOptions, isLoading: rulesetsLoading } =
		useRulesetOptions();
	const { data: outboundOptions, isLoading: outboundsLoading } =
		useOutboundGroupOptions();
	const { data: allDnsServers, isLoading: dnsServersLoading } = useDnsList();

	// 只显示在 DNS Configuration 中选中的 DNS servers
	const selectedDnsServerItems = useMemo(() => {
		if (!allDnsServers) return [];
		return allDnsServers.filter((server) => dnsServers.includes(server.uuid));
	}, [allDnsServers, dnsServers]);

	// 如果选择了多个 DNS server，default_domain_resolver 必填
	const isMultipleDnsServers = dnsServers.length > 1;

	// 过滤掉 filter 类型，只保留 outbound 和 outbound_group
	const filteredOutboundOptions = useMemo(() => {
		if (!outboundOptions) return [];
		return outboundOptions.filter((option) => option.source !== "filter");
	}, [outboundOptions]);

	// 构建 outbound SelectorDrawer items（带分组）
	const outboundDrawerItems: SelectorDrawerItem[] = useMemo(() => {
		return filteredOutboundOptions.map((o) => ({
			value: o.uuid,
			title: o.label,
			description: o.type ? `(${o.type})` : undefined,
			group:
				o.source === "outbound_group" ? "Outbound Groups" : "Outbounds",
		}));
	}, [filteredOutboundOptions]);

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
		onRulesChange([...newRules, { rulesets: [], outbound: "" }]);
	};

	const handleUpdateRule = (
		index: number,
		field: "rulesets" | "outbound",
		value: string[] | string,
	) => {
		if (!rules) return;
		const newRules = [...rules];
		if (field === "rulesets") {
			newRules[index].rulesets = value as string[];
		} else {
			newRules[index].outbound = value as string;
		}
		onRulesChange(newRules);
	};

	return (
		<AccordionItem value="route">
			<AccordionTrigger className="hover:no-underline">
				<div className="flex items-center gap-3">
					{isValid ? (
						<IconCheck className="size-5 text-green-500" />
					) : (
						<IconAlertCircle className="size-5 text-destructive" />
					)}
					<span className="font-medium">
						Route Configuration
						<span className="text-destructive ml-1">*</span>
					</span>
					{rules && rules.length > 0 && (
						<span className="text-sm text-muted-foreground ml-2">
							({rules.length} rules)
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
								Select a base route configuration. Leave unselected for empty
								base config.
							</p>
						</div>

						{routesLoading ? (
							<div className="text-sm text-muted-foreground">
								Loading route configs...
							</div>
						) : !routes || routes.length === 0 ? (
							<div className="p-4 border border-dashed rounded-lg text-center">
								<p className="text-sm text-muted-foreground">
									No route configs found. You can proceed without base
									configuration.
								</p>
							</div>
						) : (
							<SelectorDrawer
								drawerTitle="Select Base Route Configuration"
								placeholder="Select a base configuration"
								items={routes.map((r) => ({
									value: r.uuid,
									title: r.name,
									description: r.json,
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

					{/* 2. Rules 配置（可选） */}
					<div className="space-y-3">
						<div>
							<Label className="text-base">
								Route Rules{" "}
								<span className="text-muted-foreground text-sm font-normal">
									(Optional)
								</span>
							</Label>
							<p className="text-sm text-muted-foreground mt-1">
								Configure routing rules. Each rule maps rulesets to a specific
								outbound.
							</p>
						</div>

						<div className="space-y-3">
							{rules?.map((rule, index) => {
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
											) : !rulesetOptions || rulesetOptions.length === 0 ? (
												<div className="text-sm text-muted-foreground">
													No rulesets available
												</div>
											) : (
												<div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
													{rulesetOptions.map((ruleset) => {
														const isSelected = rule.rulesets.includes(
															ruleset.uuid,
														);

														return (
															<SelectableCard
																key={ruleset.uuid}
																id={`rule-${index}-ruleset-${ruleset.uuid}`}
																title={ruleset.label}
																description={ruleset.value}
																selected={isSelected}
																onToggle={() => {
																	const newRulesets = isSelected
																		? rule.rulesets.filter(
																				(r) => r !== ruleset.uuid,
																			)
																		: [...rule.rulesets, ruleset.uuid];
																	handleUpdateRule(index, "rulesets", newRulesets);
																}}
															/>
														);
													})}
												</div>
											)}
											{rule.rulesets.length === 0 && (
												<p className="text-sm text-destructive">
													Please select at least one ruleset
												</p>
											)}
										</div>

										{/* Outbound 选择 */}
										<div className="space-y-2">
											<Label className="text-sm">
												Target Outbound{" "}
												<span className="text-destructive">*</span>
											</Label>
											{outboundsLoading ? (
												<div className="text-sm text-muted-foreground">
													Loading outbounds...
												</div>
											) : filteredOutboundOptions.length === 0 ? (
												<div className="text-sm text-muted-foreground">
													No outbounds available
												</div>
											) : (
												<SelectorDrawer
													drawerTitle={`Rule #${index + 1} - Target Outbound`}
													placeholder="Select an outbound"
													items={outboundDrawerItems}
													value={rule.outbound}
													onSelect={(val) =>
														handleUpdateRule(index, "outbound", val)
													}
												/>
											)}
											{!rule.outbound && (
												<p className="text-sm text-destructive">
													Please select an outbound
												</p>
											)}
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
					</div>

					{/* 3. Final 配置（必选） */}
					<div className="space-y-3">
						<div>
							<Label className="text-base">
								Final Outbound <span className="text-destructive">*</span>
							</Label>
							<p className="text-sm text-muted-foreground mt-1">
								Select the fallback outbound for unmatched traffic.
							</p>
						</div>

						{outboundsLoading ? (
							<div className="text-sm text-muted-foreground">
								Loading outbounds...
							</div>
						) : filteredOutboundOptions.length === 0 ? (
							<div className="p-4 border border-dashed rounded-lg text-center">
								<p className="text-sm text-destructive">
									No outbounds found. Please create outbounds or outbound
									groups first.
								</p>
							</div>
						) : (
							<SelectorDrawer
								drawerTitle="Select Final Outbound"
								placeholder="Select a final outbound"
								items={outboundDrawerItems}
								value={final}
								onSelect={onFinalChange}
							/>
						)}
						{!final && filteredOutboundOptions.length > 0 && (
							<p className="text-sm text-destructive">
								Please select a final outbound
							</p>
						)}
					</div>

					{/* 4. Default Domain Resolver 配置 */}
					<div className="space-y-3">
						<div>
							<Label className="text-base">
								Default Domain Resolver{" "}
								{isMultipleDnsServers ? (
									<span className="text-destructive">*</span>
								) : (
									<span className="text-muted-foreground text-sm font-normal">
										(Optional)
									</span>
								)}
							</Label>
							<p className="text-sm text-muted-foreground mt-1">
								Select a DNS server for domain resolution in routing. Only servers selected in DNS Configuration are available.
								{isMultipleDnsServers && (
									<span className="text-destructive font-medium"> Required when multiple DNS servers are selected.</span>
								)}
							</p>
						</div>

						{dnsServersLoading ? (
							<div className="text-sm text-muted-foreground">
								Loading DNS servers...
							</div>
						) : selectedDnsServerItems.length === 0 ? (
							<div className="p-4 border border-dashed rounded-lg text-center">
								<p className="text-sm text-muted-foreground">
									No DNS servers selected in DNS Configuration. Please select DNS servers first.
								</p>
							</div>
						) : (
							<SelectorDrawer
								drawerTitle="Select Default Domain Resolver"
								placeholder="Select a DNS server"
								items={selectedDnsServerItems.map((s) => ({
									value: s.uuid,
									title: s.name,
									description: s.json,
								}))}
								value={defaultDomainResolver || ""}
								onSelect={(val) =>
									onDefaultDomainResolverChange(val || undefined)
								}
								noneOption={
									isMultipleDnsServers
										? undefined
										: { title: "None", description: "No default domain resolver" }
								}
							/>
						)}
						{isMultipleDnsServers && !defaultDomainResolver && (
							<p className="text-sm text-destructive">
								Please select a default domain resolver
							</p>
						)}
					</div>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
