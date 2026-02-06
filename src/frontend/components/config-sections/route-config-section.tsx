import { useRouteList } from "@/api/route/list";
import { useRulesetOptions } from "@/api/ruleset/options";
import { useOutboundGroupOptions } from "@/api/outbound-group/options";
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
import { RadioGroup } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
	isValid: boolean;
}

export function RouteConfigSection({
	config,
	onConfigChange,
	rules,
	onRulesChange,
	final,
	onFinalChange,
	isValid,
}: RouteConfigSectionProps) {
	const { data: routes, isLoading: routesLoading } = useRouteList();
	const { data: rulesetOptions, isLoading: rulesetsLoading } =
		useRulesetOptions();
	const { data: outboundOptions, isLoading: outboundsLoading } =
		useOutboundGroupOptions();

	// 过滤掉 filter 类型，只保留 outbound 和 outbound_group
	const filteredOutboundOptions = useMemo(() => {
		if (!outboundOptions) return [];
		return outboundOptions.filter(
			(option) => option.source !== "filter",
		);
	}, [outboundOptions]);

	// 按 source 分组
	const groupedOutboundOptions = useMemo(() => {
		const groups: Record<string, typeof filteredOutboundOptions> = {
			outbound_group: [],
			outbound: [],
		};

		for (const option of filteredOutboundOptions) {
			if (groups[option.source]) {
				groups[option.source].push(option);
			}
		}

		return groups;
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
							<RadioGroup
								value={config || "none"}
								onValueChange={(value) =>
									onConfigChange(value === "none" ? undefined : value)
								}
							>
								<div className="grid grid-cols-1 gap-2">
									<RadioCard
										id="route-config-none"
										value="none"
										title="No base config"
										description="Use empty base configuration"
										selected={!config || config === "none"}
									/>
									{routes.map((configItem) => (
										<RadioCard
											key={configItem.uuid}
											id={`route-config-${configItem.uuid}`}
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
												<Select
													value={rule.outbound}
													onValueChange={(value) =>
														handleUpdateRule(index, "outbound", value)
													}
												>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="Select an outbound">
															{rule.outbound && (
																<span>
																	{
																		filteredOutboundOptions.find(
																			(o) => o.uuid === rule.outbound,
																		)?.label
																	}
																	<span className="text-xs text-muted-foreground ml-2">
																		(
																		{
																			filteredOutboundOptions.find(
																				(o) => o.uuid === rule.outbound,
																			)?.source
																		}
																		{filteredOutboundOptions.find(
																			(o) => o.uuid === rule.outbound,
																		)?.type &&
																			` - ${filteredOutboundOptions.find((o) => o.uuid === rule.outbound)?.type}`}
																		)
																	</span>
																</span>
															)}
														</SelectValue>
													</SelectTrigger>
													<SelectContent>
														{groupedOutboundOptions.outbound_group.length > 0 && (
															<SelectGroup>
																<SelectLabel>Outbound Groups</SelectLabel>
																{groupedOutboundOptions.outbound_group.map(
																	(outbound) => (
																		<SelectItem
																			key={outbound.uuid}
																			value={outbound.uuid}
																		>
																			<span className="font-medium">
																				{outbound.label}
																			</span>
																			{outbound.type && (
																				<span className="text-xs text-muted-foreground ml-2">
																					({outbound.type})
																				</span>
																			)}
																		</SelectItem>
																	),
																)}
															</SelectGroup>
														)}
														{groupedOutboundOptions.outbound.length > 0 && (
															<SelectGroup>
																<SelectLabel>Outbounds</SelectLabel>
																{groupedOutboundOptions.outbound.map((outbound) => (
																	<SelectItem
																		key={outbound.uuid}
																		value={outbound.uuid}
																	>
																		<span className="font-medium">
																			{outbound.label}
																		</span>
																		{outbound.type && (
																			<span className="text-xs text-muted-foreground ml-2">
																				({outbound.type})
																			</span>
																		)}
																	</SelectItem>
																))}
															</SelectGroup>
														)}
													</SelectContent>
												</Select>
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
							<Select value={final || undefined} onValueChange={onFinalChange}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select a final outbound">
										{final && (
											<span>
												{
													filteredOutboundOptions.find((o) => o.uuid === final)
														?.label
												}
												<span className="text-xs text-muted-foreground ml-2">
													(
													{
														filteredOutboundOptions.find((o) => o.uuid === final)
															?.source
													}
													{filteredOutboundOptions.find((o) => o.uuid === final)
														?.type &&
														` - ${filteredOutboundOptions.find((o) => o.uuid === final)?.type}`}
													)
												</span>
											</span>
										)}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{groupedOutboundOptions.outbound_group.length > 0 && (
										<SelectGroup>
											<SelectLabel>Outbound Groups</SelectLabel>
											{groupedOutboundOptions.outbound_group.map((outbound) => (
												<SelectItem key={outbound.uuid} value={outbound.uuid}>
													<span className="font-medium">{outbound.label}</span>
													{outbound.type && (
														<span className="text-xs text-muted-foreground ml-2">
															({outbound.type})
														</span>
													)}
												</SelectItem>
											))}
										</SelectGroup>
									)}
									{groupedOutboundOptions.outbound.length > 0 && (
										<SelectGroup>
											<SelectLabel>Outbounds</SelectLabel>
											{groupedOutboundOptions.outbound.map((outbound) => (
												<SelectItem key={outbound.uuid} value={outbound.uuid}>
													<span className="font-medium">{outbound.label}</span>
													{outbound.type && (
														<span className="text-xs text-muted-foreground ml-2">
															({outbound.type})
														</span>
													)}
												</SelectItem>
											))}
										</SelectGroup>
									)}
								</SelectContent>
							</Select>
						)}
						{!final && filteredOutboundOptions.length > 0 && (
							<p className="text-sm text-destructive">
								Please select a final outbound
							</p>
						)}
					</div>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
