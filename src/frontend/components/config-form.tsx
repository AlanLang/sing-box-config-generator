import { useDnsConfigList } from "@/api/dns-config/list";
import { useDnsList } from "@/api/dns/list";
import { useLogList } from "@/api/log/list";
import { useRulesetList } from "@/api/ruleset/list";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	IconAlertCircle,
	IconArrowUp,
	IconArrowDown,
	IconCheck,
	IconDeviceFloppy,
	IconPlus,
	IconTrash,
	IconX,
} from "@tabler/icons-react";
import { useState } from "react";

interface ConfigFormProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (data: ConfigFormData) => void;
	initialData?: Partial<ConfigFormData>;
}

interface SingBoxConfig {
	name: string;
	/**
	 * 日志配置的 uuid
	 */
	log: string;
	dns: {
		/**
		 * dns-config 的 uuid
		 */
		config?: string;
		/**
		 * dns-server 的 uuid 列表
		 */
		servers: string[];
		rules?: {
			/**
			 * ruleset 的 uuid 列表
			 */
			rule_set: string[];
			/**
			 * dns-server 的 uuid
			 */
			server: string;
		}[],
		final: string;
	}
}

export interface DnsRule {
	rule_set: string[];
	server: string;
}

export interface ConfigFormData {
	name: string;
	logUuid: string | null;
	dns: {
		config: string | null;
		servers: string[];
		rules: DnsRule[];
		final: string | null;
	};
	// TODO: 添加其他模块的字段
	// inboundsUuids: string[];
	// outboundsUuids: string[];
	// routeUuid: string | null;
	// experimentalUuid: string | null;
}

export function ConfigForm({
	isOpen,
	onClose,
	onSave,
	initialData,
}: ConfigFormProps) {
	const [name, setName] = useState(initialData?.name || "");
	const [logUuid, setLogUuid] = useState<string | null>(
		initialData?.logUuid || null,
	);

	// DNS 配置状态
	const [dnsConfig, setDnsConfig] = useState<string | null>(
		initialData?.dns?.config || null,
	);
	const [dnsServers, setDnsServers] = useState<string[]>(
		initialData?.dns?.servers || [],
	);
	const [dnsRules, setDnsRules] = useState<DnsRule[]>(
		initialData?.dns?.rules || [],
	);
	const [dnsFinal, setDnsFinal] = useState<string | null>(
		initialData?.dns?.final || null,
	);

	const { data: logs, isLoading: logsLoading } = useLogList();
	const { data: dnsConfigs, isLoading: dnsConfigsLoading } = useDnsConfigList();
	const { data: dnsServerList, isLoading: dnsServersLoading } = useDnsList();
	const { data: rulesets, isLoading: rulesetsLoading } = useRulesetList();

	// 检查表单是否有效（所有必填项已填写）
	const isDnsValid =
		dnsServers.length > 0 &&
		dnsFinal !== null &&
		dnsServers.includes(dnsFinal) &&
		dnsRules.every(rule =>
			rule.rule_set.length > 0 &&
			rule.server &&
			dnsServers.includes(rule.server)
		);

	const isValid = name.trim().length >= 2 && logUuid !== null && isDnsValid;

	const handleSave = () => {
		if (!isValid) return;

		onSave({
			name,
			logUuid,
			dns: {
				config: dnsConfig,
				servers: dnsServers,
				rules: dnsRules,
				final: dnsFinal,
			},
		});
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
			<div className="fixed inset-y-0 right-0 w-full md:w-[600px] lg:w-[700px] bg-background border-l shadow-lg">
				<div className="flex flex-col h-full">
					{/* Header */}
					<div className="flex items-center justify-between p-6 border-b">
						<div>
							<h2 className="text-2xl font-bold">Create Config</h2>
							<p className="text-sm text-muted-foreground mt-1">
								Configure modules to generate SingBox configuration
							</p>
						</div>
						<Button variant="ghost" size="icon" onClick={onClose}>
							<IconX className="size-5" />
						</Button>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto">
						<div className="space-y-6 p-6">
							{/* 基本信息 */}
							<div className="space-y-2">
								<Label htmlFor="config-name">
									Config Name <span className="text-destructive">*</span>
								</Label>
								<Input
									id="config-name"
									placeholder="Enter config name (2-50 characters)"
									value={name}
									onChange={(e) => setName(e.target.value)}
									minLength={2}
									maxLength={50}
								/>
								{name.trim().length > 0 && name.trim().length < 2 && (
									<p className="text-sm text-destructive">
										Name must be at least 2 characters
									</p>
								)}
							</div>

							{/* 模块配置 */}
							<div className="space-y-2">
								<Label>Module Configuration</Label>
								<p className="text-sm text-muted-foreground">
									Configure each required module. Modules marked with{" "}
									<span className="text-destructive">*</span> are required.
								</p>

								<Accordion type="single" collapsible className="w-full">
									{/* LOG 模块 */}
									<AccordionItem value="log">
										<AccordionTrigger className="hover:no-underline">
											<div className="flex items-center gap-3">
												{logUuid ? (
													<IconCheck className="size-5 text-green-500" />
												) : (
													<IconAlertCircle className="size-5 text-destructive" />
												)}
												<span className="font-medium">
													LOG Configuration
													<span className="text-destructive ml-1">*</span>
												</span>
												{logUuid && logs && (
													<span className="text-sm text-muted-foreground ml-2">
														({logs.find((l) => l.uuid === logUuid)?.name})
													</span>
												)}
											</div>
										</AccordionTrigger>
										<AccordionContent>
											<div className="pt-4 space-y-4">
												<p className="text-sm text-muted-foreground">
													Select a log configuration from your existing log
													configurations.
												</p>

												{logsLoading ? (
													<div className="text-sm text-muted-foreground">
														Loading logs...
													</div>
												) : !logs || logs.length === 0 ? (
													<div className="p-4 border border-dashed rounded-lg text-center">
														<p className="text-sm text-muted-foreground">
															No log configurations found. Please create a log
															configuration first.
														</p>
													</div>
												) : (
													<RadioGroup
														value={logUuid || undefined}
														onValueChange={setLogUuid}
													>
														<div className="space-y-2">
															{logs.map((log) => (
																<div
																	key={log.uuid}
																	className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
																>
																	<RadioGroupItem
																		value={log.uuid}
																		id={`log-${log.uuid}`}
																	/>
																	<Label
																		htmlFor={`log-${log.uuid}`}
																		className="flex-1 cursor-pointer"
																	>
																		<div className="font-medium">{log.name}</div>
																		<div className="text-sm text-muted-foreground line-clamp-1">
																			{log.json.substring(0, 100)}
																			{log.json.length > 100 && "..."}
																		</div>
																	</Label>
																</div>
															))}
														</div>
													</RadioGroup>
												)}
											</div>
										</AccordionContent>
									</AccordionItem>

									{/* DNS 模块 */}
									<AccordionItem value="dns">
										<AccordionTrigger className="hover:no-underline">
											<div className="flex items-center gap-3">
												{isDnsValid ? (
													<IconCheck className="size-5 text-green-500" />
												) : (
													<IconAlertCircle className="size-5 text-destructive" />
												)}
												<span className="font-medium">
													DNS Configuration
													<span className="text-destructive ml-1">*</span>
												</span>
												{dnsServers.length > 0 && (
													<span className="text-sm text-muted-foreground ml-2">
														({dnsServers.length} servers, {dnsRules.length} rules)
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
															Select a base DNS configuration. Leave unselected for
															empty base config.
														</p>
													</div>

													{dnsConfigsLoading ? (
														<div className="text-sm text-muted-foreground">
															Loading DNS configs...
														</div>
													) : !dnsConfigs || dnsConfigs.length === 0 ? (
														<div className="p-4 border border-dashed rounded-lg text-center">
															<p className="text-sm text-muted-foreground">
																No DNS configs found. You can proceed without
																base configuration.
															</p>
														</div>
													) : (
														<RadioGroup
															value={dnsConfig || "none"}
															onValueChange={(value) =>
																setDnsConfig(value === "none" ? null : value)
															}
														>
															<div className="space-y-2">
																<div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
																	<RadioGroupItem value="none" id="dns-config-none" />
																	<Label
																		htmlFor="dns-config-none"
																		className="flex-1 cursor-pointer"
																	>
																		<div className="font-medium">No base config</div>
																		<div className="text-sm text-muted-foreground">
																			Use empty base configuration
																		</div>
																	</Label>
																</div>
																{dnsConfigs.map((config) => (
																	<div
																		key={config.uuid}
																		className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
																	>
																		<RadioGroupItem
																			value={config.uuid}
																			id={`dns-config-${config.uuid}`}
																		/>
																		<Label
																			htmlFor={`dns-config-${config.uuid}`}
																			className="flex-1 cursor-pointer"
																		>
																			<div className="font-medium">
																				{config.name}
																			</div>
																			<div className="text-sm text-muted-foreground line-clamp-1">
																				{config.json.substring(0, 100)}
																				{config.json.length > 100 && "..."}
																			</div>
																		</Label>
																	</div>
																))}
															</div>
														</RadioGroup>
													)}
												</div>

												{/* 2. DNS Servers（必选，多选） */}
												<div className="space-y-3">
													<div>
														<Label className="text-base">
															DNS Servers{" "}
															<span className="text-destructive">*</span>
														</Label>
														<p className="text-sm text-muted-foreground mt-1">
															Select at least one DNS server. These will be
															available for rules and final configuration.
														</p>
													</div>

													{dnsServersLoading ? (
														<div className="text-sm text-muted-foreground">
															Loading DNS servers...
														</div>
													) : !dnsServerList || dnsServerList.length === 0 ? (
														<div className="p-4 border border-dashed rounded-lg text-center">
															<p className="text-sm text-destructive">
																No DNS servers found. Please create DNS servers
																first.
															</p>
														</div>
													) : (
														<div className="space-y-2">
															{dnsServerList.map((server) => (
																<div
																	key={server.uuid}
																	className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
																>
																	<Checkbox
																		id={`dns-server-${server.uuid}`}
																		checked={dnsServers.includes(server.uuid)}
																		onCheckedChange={(checked) => {
																			if (checked) {
																				setDnsServers([...dnsServers, server.uuid]);
																			} else {
																				const newServers = dnsServers.filter(
																					(s) => s !== server.uuid,
																				);
																				setDnsServers(newServers);
																				// 如果被取消的 server 是 final，清空 final
																				if (dnsFinal === server.uuid) {
																					setDnsFinal(null);
																				}
																				// 清理 rules 中使用了该 server 的规则
																				setDnsRules(
																					dnsRules.filter(
																						(rule) => rule.server !== server.uuid,
																					),
																				);
																			}
																		}}
																	/>
																	<Label
																		htmlFor={`dns-server-${server.uuid}`}
																		className="flex-1 cursor-pointer"
																	>
																		<div className="font-medium">{server.name}</div>
																		<div className="text-sm text-muted-foreground line-clamp-1">
																			{server.json.substring(0, 100)}
																			{server.json.length > 100 && "..."}
																		</div>
																	</Label>
																</div>
															))}
														</div>
													)}
													{dnsServers.length === 0 && dnsServerList && dnsServerList.length > 0 && (
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
															Configure DNS routing rules. Each rule maps rulesets
															to a specific DNS server.
														</p>
													</div>

													{dnsServers.length === 0 ? (
														<div className="p-4 border border-dashed rounded-lg text-center">
															<p className="text-sm text-muted-foreground">
																Select DNS servers first to configure rules.
															</p>
														</div>
													) : (
														<div className="space-y-3">
															{dnsRules.map((rule, index) => {
																// 获取当前 rule 外的其他 rules 已使用的 rulesets
																const usedRulesets = dnsRules
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
																				{/* 上移按钮 */}
																				<Button
																					variant="ghost"
																					size="sm"
																					disabled={index === 0}
																					onClick={() => {
																						const newRules = [...dnsRules];
																						[newRules[index - 1], newRules[index]] = [
																							newRules[index],
																							newRules[index - 1],
																						];
																						setDnsRules(newRules);
																					}}
																					title="Move up"
																				>
																					<IconArrowUp className="size-4" />
																				</Button>
																				{/* 下移按钮 */}
																				<Button
																					variant="ghost"
																					size="sm"
																					disabled={index === dnsRules.length - 1}
																					onClick={() => {
																						const newRules = [...dnsRules];
																						[newRules[index], newRules[index + 1]] = [
																							newRules[index + 1],
																							newRules[index],
																						];
																						setDnsRules(newRules);
																					}}
																					title="Move down"
																				>
																					<IconArrowDown className="size-4" />
																				</Button>
																				{/* 删除按钮 */}
																				<Button
																					variant="ghost"
																					size="sm"
																					onClick={() => {
																						setDnsRules(
																							dnsRules.filter((_, i) => i !== index),
																						);
																					}}
																					title="Delete rule"
																				>
																					<IconTrash className="size-4" />
																				</Button>
																			</div>
																		</div>

																		{/* Rulesets 选择 - 点击显示选中边框和角标 */}
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
																							<button
																								key={ruleset.uuid}
																								type="button"
																								disabled={isUsedByOthers}
																								onClick={() => {
																									const newRules = [...dnsRules];
																									if (isSelected) {
																										// 取消选择
																										newRules[index].rule_set =
																											rule.rule_set.filter(
																												(r) => r !== ruleset.uuid,
																											);
																									} else {
																										// 添加选择
																										newRules[index].rule_set = [
																											...rule.rule_set,
																											ruleset.uuid,
																										];
																									}
																									setDnsRules(newRules);
																								}}
																								className={`
																									relative w-full text-left p-3 rounded-lg border-2 transition-all
																									${
																										isSelected
																											? "border-primary bg-primary/5"
																											: "border-border hover:border-primary/50 hover:bg-muted/30"
																									}
																									${
																										isUsedByOthers
																											? "opacity-50 cursor-not-allowed"
																											: "cursor-pointer"
																									}
																								`}
																							>
																								{/* 选中角标 - 垂直居中 */}
																								{isSelected && (
																									<div className="absolute top-1/2 -translate-y-1/2 right-3 size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
																										<IconCheck className="size-3.5" />
																									</div>
																								)}

																								{/* 已被其他 rule 使用的标记 */}
																								{isUsedByOthers && (
																									<div className="absolute top-1/2 -translate-y-1/2 right-3 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
																										Used
																									</div>
																								)}

																								<div className="font-medium text-sm pr-8">
																									{ruleset.name}
																								</div>
																								<div className="text-xs text-muted-foreground line-clamp-1 mt-1">
																									{ruleset.json.substring(0, 80)}
																									{ruleset.json.length > 80 && "..."}
																								</div>
																							</button>
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
																				onValueChange={(value) => {
																					const newRules = [...dnsRules];
																					newRules[index].server = value;
																					setDnsRules(newRules);
																				}}
																			>
																				<div className="space-y-1">
																					{dnsServers.map((serverUuid) => {
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
																onClick={() => {
																	setDnsRules([
																		...dnsRules,
																		{ rule_set: [], server: dnsServers[0] || "" },
																	]);
																}}
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
															Final DNS Server{" "}
															<span className="text-destructive">*</span>
														</Label>
														<p className="text-sm text-muted-foreground mt-1">
															Select the fallback DNS server for unmatched queries.
														</p>
													</div>

													{dnsServers.length === 0 ? (
														<div className="p-4 border border-dashed rounded-lg text-center">
															<p className="text-sm text-muted-foreground">
																Select DNS servers first to configure final server.
															</p>
														</div>
													) : (
														<RadioGroup
															value={dnsFinal || undefined}
															onValueChange={setDnsFinal}
														>
															<div className="space-y-2">
																{dnsServers.map((serverUuid) => {
																	const server = dnsServerList?.find(
																		(s) => s.uuid === serverUuid,
																	);
																	if (!server) return null;
																	return (
																		<div
																			key={server.uuid}
																			className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
																		>
																			<RadioGroupItem
																				value={server.uuid}
																				id={`final-server-${server.uuid}`}
																			/>
																			<Label
																				htmlFor={`final-server-${server.uuid}`}
																				className="flex-1 cursor-pointer"
																			>
																				<div className="font-medium">
																					{server.name}
																				</div>
																				<div className="text-sm text-muted-foreground line-clamp-1">
																					{server.json.substring(0, 100)}
																					{server.json.length > 100 && "..."}
																				</div>
																			</Label>
																		</div>
																	);
																})}
															</div>
														</RadioGroup>
													)}
													{dnsFinal === null && dnsServers.length > 0 && (
														<p className="text-sm text-destructive">
															Please select a final DNS server
														</p>
													)}
												</div>
											</div>
										</AccordionContent>
									</AccordionItem>

									{/* TODO: 其他模块 */}
									<AccordionItem value="inbounds" disabled>
										<AccordionTrigger className="hover:no-underline opacity-50">
											<div className="flex items-center gap-3">
												<IconAlertCircle className="size-5 text-muted-foreground" />
												<span className="font-medium">Inbounds Configuration</span>
												<span className="text-xs text-muted-foreground">
													(Coming soon)
												</span>
											</div>
										</AccordionTrigger>
									</AccordionItem>

									<AccordionItem value="outbounds" disabled>
										<AccordionTrigger className="hover:no-underline opacity-50">
											<div className="flex items-center gap-3">
												<IconAlertCircle className="size-5 text-muted-foreground" />
												<span className="font-medium">
													Outbounds Configuration
												</span>
												<span className="text-xs text-muted-foreground">
													(Coming soon)
												</span>
											</div>
										</AccordionTrigger>
									</AccordionItem>

									<AccordionItem value="route" disabled>
										<AccordionTrigger className="hover:no-underline opacity-50">
											<div className="flex items-center gap-3">
												<IconAlertCircle className="size-5 text-muted-foreground" />
												<span className="font-medium">Route Configuration</span>
												<span className="text-xs text-muted-foreground">
													(Coming soon)
												</span>
											</div>
										</AccordionTrigger>
									</AccordionItem>

									<AccordionItem value="experimental" disabled>
										<AccordionTrigger className="hover:no-underline opacity-50">
											<div className="flex items-center gap-3">
												<IconAlertCircle className="size-5 text-muted-foreground" />
												<span className="font-medium">
													Experimental Configuration
												</span>
												<span className="text-xs text-muted-foreground">
													(Coming soon)
												</span>
											</div>
										</AccordionTrigger>
									</AccordionItem>
								</Accordion>
							</div>
						</div>
					</div>

					{/* Footer */}
					<div className="flex items-center justify-between p-6 border-t">
						<div className="text-sm text-muted-foreground">
							{isValid ? (
								<span className="text-green-500 flex items-center gap-2">
									<IconCheck className="size-4" />
									Ready to save
								</span>
							) : (
								<span className="flex items-center gap-2">
									<IconAlertCircle className="size-4" />
									Please complete all required fields
								</span>
							)}
						</div>
						<div className="flex gap-2">
							<Button variant="outline" onClick={onClose}>
								Cancel
							</Button>
							<Button onClick={handleSave} disabled={!isValid}>
								<IconDeviceFloppy className="size-4 mr-2" />
								Save Config
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
