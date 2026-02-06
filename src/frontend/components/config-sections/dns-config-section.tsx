import { useDnsConfigList } from "@/api/dns-config/list";
import { useDnsList } from "@/api/dns/list";
import { useRulesetList } from "@/api/ruleset/list";
import type { SingBoxConfig } from "@/components/config-form";
import { RadioCard } from "@/components/radio-card";
import { SelectableCard } from "@/components/selectable-card";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	IconAlertCircle,
	IconArrowDown,
	IconArrowUp,
	IconCheck,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";

interface DnsConfigSectionProps {
	config: string | undefined;
	onConfigChange: (value: string | undefined) => void;
	servers: string[];
	onServersChange: (value: string[]) => void;
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
	final,
	onFinalChange,
	isValid,
}: DnsConfigSectionProps) {
	const { data: dnsConfigs, isLoading: dnsConfigsLoading } =
		useDnsConfigList();
	const { data: dnsServerList, isLoading: dnsServersLoading } = useDnsList();
	const { data: rulesets, isLoading: rulesetsLoading } = useRulesetList();

	const handleServerToggle = (serverUuid: string, checked: boolean) => {
		if (checked) {
			onServersChange([...servers, serverUuid]);
		} else {
			const newServers = servers.filter((s) => s !== serverUuid);
			onServersChange(newServers);
			// 如果被取消的 server 是 final，清空 final
			if (final === serverUuid) {
				onFinalChange("");
			}
			// 清理 rules 中使用了该 server 的规则
			if (rules) {
				onRulesChange(rules.filter((rule) => rule.server !== serverUuid));
			}
		}
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
		onRulesChange([...newRules, { rule_set: [], server: servers[0] || "" }]);
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
							<RadioGroup
								value={config || "none"}
								onValueChange={(value) =>
									onConfigChange(value === "none" ? undefined : value)
								}
							>
								<div className="grid grid-cols-1 gap-2">
									<RadioCard
										id="dns-config-none"
										value="none"
										title="No base config"
										description="Use empty base configuration"
										selected={!config || config === "none"}
									/>
									{dnsConfigs.map((configItem) => (
										<RadioCard
											key={configItem.uuid}
											id={`dns-config-${configItem.uuid}`}
											value={configItem.uuid}
											title={configItem.name}
											description={configItem.json}
											selected={config === configItem.uuid}
										/>
									))}
								</div>
							</RadioGroup>
						)}
					</div>

					{/* 2. DNS Servers（必选，多选） */}
					<div className="space-y-3">
						<div>
							<Label className="text-base">
								DNS Servers <span className="text-destructive">*</span>
							</Label>
							<p className="text-sm text-muted-foreground mt-1">
								Select at least one DNS server. These will be available for
								rules and final configuration.
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
							<div className="grid grid-cols-1 gap-2">
								{dnsServerList.map((server) => (
									<SelectableCard
										key={server.uuid}
										id={`dns-server-${server.uuid}`}
										title={server.name}
										description={server.json}
										selected={servers.includes(server.uuid)}
										onToggle={(selected) =>
											handleServerToggle(server.uuid, selected)
										}
									/>
								))}
							</div>
						)}
						{servers.length === 0 &&
							dnsServerList &&
							dnsServerList.length > 0 && (
								<p className="text-sm text-destructive">
									Please select at least one DNS server
								</p>
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
													<div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
														{rulesets.map((ruleset) => {
															const isSelected = rule.rule_set.includes(
																ruleset.uuid,
															);
															const isUsedByOthers =
																usedRulesets.includes(ruleset.uuid);

															return (
																<SelectableCard
																	key={ruleset.uuid}
																	id={`rule-${index}-ruleset-${ruleset.uuid}`}
																	title={ruleset.name}
																	description={ruleset.json}
																	selected={isSelected}
																	disabled={isUsedByOthers}
																	disabledLabel="Used"
																	onToggle={() => {
																		const newRuleSet = isSelected
																			? rule.rule_set.filter(
																					(r) => r !== ruleset.uuid,
																				)
																			: [...rule.rule_set, ruleset.uuid];
																		handleUpdateRule(index, "rule_set", newRuleSet);
																	}}
																/>
															);
														})}
													</div>
												)}
											</div>

											{/* Server 选择 */}
											<div className="space-y-2">
												<Label className="text-sm">
													Target Server{" "}
													<span className="text-destructive">*</span>
												</Label>
												<RadioGroup
													value={rule.server}
													onValueChange={(value) =>
														handleUpdateRule(index, "server", value)
													}
												>
													<div className="space-y-1">
														{servers.map((serverUuid) => {
															const server = dnsServerList?.find(
																(s) => s.uuid === serverUuid,
															);
															if (!server) return null;
															return (
																<div
																	key={server.uuid}
																	className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded"
																>
																	<RadioGroupItem
																		value={server.uuid}
																		id={`rule-${index}-server-${server.uuid}`}
																	/>
																	<Label
																		htmlFor={`rule-${index}-server-${server.uuid}`}
																		className="flex-1 cursor-pointer text-sm"
																	>
																		{server.name}
																	</Label>
																</div>
															);
														})}
													</div>
												</RadioGroup>
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
							<RadioGroup value={final || undefined} onValueChange={onFinalChange}>
								<div className="grid grid-cols-1 gap-2">
									{servers.map((serverUuid) => {
										const server = dnsServerList?.find(
											(s) => s.uuid === serverUuid,
										);
										if (!server) return null;
										return (
											<RadioCard
												key={server.uuid}
												id={`final-server-${server.uuid}`}
												value={server.uuid}
												title={server.name}
												description={server.json}
												selected={final === server.uuid}
											/>
										);
									})}
								</div>
							</RadioGroup>
						)}
						{!final && servers.length > 0 && (
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
