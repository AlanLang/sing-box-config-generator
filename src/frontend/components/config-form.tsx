import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	IconAlertCircle,
	IconCheck,
	IconDeviceFloppy,
	IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { DnsConfigSection } from "./config-sections/dns-config-section";
import { LogConfigSection } from "./config-sections/log-config-section";
import { InboundsConfigSection } from "./config-sections/inbounds-config-section";
import { RouteConfigSection } from "./config-sections/route-config-section";
import { ExperimentalConfigSection } from "./config-sections/experimental-config-section";
import { OtherConfigSection } from "./config-sections/other-config-section";

export interface SingBoxConfig {
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
		}[];
		final: string;
	};
	/**
	 * inbound 的 uuid 列表
	 */
	inbounds: string[];
	route: {
		/**
		 * route 基础配置的 uuid（可选）
		 */
		config?: string;
		/**
		 * route rules - 支持 Ruleset 和 Rule 两种类型
		 */
		rules?: (
			| {
					type: "ruleset";
					/** ruleset 的 uuid 列表 */
					rulesets: string[];
					/** outbound 的 uuid（可以是 outbound 或 outbound_group） */
					outbound: string;
			  }
			| {
					type: "rule";
					/** rule 模块的 uuid */
					rule: string;
					/** outbound 的 uuid（可选，覆盖 rule 中的 outbound） */
					outbound?: string;
			  }
		)[];
		/**
		 * final outbound 的 uuid
		 */
		final: string;
		/**
		 * default domain resolver 的 uuid（可选）
		 */
		default_domain_resolver?: string;
	};
	/**
	 * experimental 配置的 uuid
	 */
	experimental: string;
	/**
	 * 扩展配置
	 */
	ext_config: {
		/**
		 * download_detour: outbound 或 outbound_group 的 uuid
		 * 用于 remote rule_set 的 download_detour 和 experimental.clash_api.external_ui_download_detour
		 */
		download_detour: string;
	};
}

/** Normalize route rules: old configs without "type" field are treated as "ruleset" */
function normalizeRouteRules(
	rules?: SingBoxConfig["route"]["rules"],
): SingBoxConfig["route"]["rules"] {
	if (!rules) return [];
	return rules.map((rule) => {
		if ("type" in rule && rule.type) return rule;
		// Old format without type field → Ruleset
		const legacy = rule as { rulesets?: string[]; outbound?: string };
		return {
			type: "ruleset" as const,
			rulesets: legacy.rulesets || [],
			outbound: legacy.outbound || "",
		};
	});
}

interface ConfigFormProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (data: SingBoxConfig) => void;
	initialData?: Partial<SingBoxConfig>;
}

export function ConfigForm({
	isOpen,
	onClose,
	onSave,
	initialData,
}: ConfigFormProps) {
	const [name, setName] = useState(initialData?.name || "");
	const [log, setLog] = useState<string>(initialData?.log || "");

	// DNS 配置状态
	const [dnsConfig, setDnsConfig] = useState<string | undefined>(
		initialData?.dns?.config,
	);
	const [dnsServers, setDnsServers] = useState<string[]>(
		initialData?.dns?.servers || [],
	);
	const [dnsRules, setDnsRules] = useState<SingBoxConfig["dns"]["rules"]>(
		initialData?.dns?.rules || [],
	);
	const [dnsFinal, setDnsFinal] = useState<string>(
		initialData?.dns?.final || "",
	);

	// Inbounds 配置状态
	const [inbounds, setInbounds] = useState<string[]>(
		initialData?.inbounds || [],
	);

	// Route 配置状态
	const [routeConfig, setRouteConfig] = useState<string | undefined>(
		initialData?.route?.config,
	);
	const [routeRules, setRouteRules] = useState<SingBoxConfig["route"]["rules"]>(
		normalizeRouteRules(initialData?.route?.rules),
	);
	const [routeFinal, setRouteFinal] = useState<string>(
		initialData?.route?.final || "",
	);
	const [routeDefaultDomainResolver, setRouteDefaultDomainResolver] = useState<string | undefined>(
		initialData?.route?.default_domain_resolver,
	);

	// Experimental 配置状态
	const [experimental, setExperimental] = useState<string>(
		initialData?.experimental || "",
	);

	// Other 配置状态
	const [downloadDetour, setDownloadDetour] = useState<string>(
		initialData?.ext_config?.download_detour || "",
	);

	// 当 initialData 变化时，更新所有状态
	useEffect(() => {
		setName(initialData?.name || "");
		setLog(initialData?.log || "");
		setDnsConfig(initialData?.dns?.config);
		setDnsServers(initialData?.dns?.servers || []);
		setDnsRules(initialData?.dns?.rules || []);
		setDnsFinal(initialData?.dns?.final || "");
		setInbounds(initialData?.inbounds || []);
		setRouteConfig(initialData?.route?.config);
		setRouteRules(normalizeRouteRules(initialData?.route?.rules));
		setRouteFinal(initialData?.route?.final || "");
		setRouteDefaultDomainResolver(initialData?.route?.default_domain_resolver);
		setExperimental(initialData?.experimental || "");
		setDownloadDetour(initialData?.ext_config?.download_detour || "");
	}, [initialData]);

	// 当选中的 DNS server 变化时，清除不在列表中的 default domain resolver
	useEffect(() => {
		if (routeDefaultDomainResolver && !dnsServers.includes(routeDefaultDomainResolver)) {
			setRouteDefaultDomainResolver(undefined);
		}
	}, [dnsServers, routeDefaultDomainResolver]);

	// 判断是否为编辑模式
	const isEditMode = !!initialData?.name;

	// 检查表单是否有效（所有必填项已填写）
	const isDnsValid =
		dnsServers.length > 0 &&
		!!dnsFinal &&
		dnsServers.includes(dnsFinal) &&
		(!dnsRules ||
			dnsRules.every(
				(rule) =>
					rule.rule_set.length > 0 &&
					rule.server &&
					dnsServers.includes(rule.server),
			));

	const isRouteValid =
		!!routeFinal &&
		(!routeRules ||
			routeRules.every((rule) => {
				if (rule.type === "rule") {
					return !!rule.rule;
				}
				// type === "ruleset"
				return rule.rulesets.length > 0 && !!rule.outbound;
			})) &&
		// 如果选择了多个 DNS server，default_domain_resolver 必填，且必须是已选中的 DNS server
		(dnsServers.length <= 1 || (!!routeDefaultDomainResolver && dnsServers.includes(routeDefaultDomainResolver)));

	const isValid =
		name.trim().length >= 2 && log && isDnsValid && inbounds.length > 0 && isRouteValid && !!experimental && !!downloadDetour;

	const handleSave = () => {
		if (!isValid) return;

		onSave({
			name,
			log,
			dns: {
				config: dnsConfig,
				servers: dnsServers,
				rules: dnsRules,
				final: dnsFinal,
			},
			inbounds,
			route: {
				config: routeConfig,
				rules: routeRules,
				final: routeFinal,
				default_domain_resolver: routeDefaultDomainResolver,
			},
			experimental,
			ext_config: {
				download_detour: downloadDetour,
			},
		});
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* 背景遮罩 - 淡入效果 */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
						onClick={onClose}
					/>

					{/* 抽屉 - 从右侧滑入 + 弹性效果 */}
					<motion.div
						initial={{ x: "100%" }}
						animate={{ x: 0 }}
						exit={{ x: "100%" }}
						transition={{
							type: "spring",
							damping: 30,
							stiffness: 300,
						}}
						className="fixed inset-y-0 right-0 z-50 w-full md:w-[600px] lg:w-[700px] bg-background border-l shadow-2xl"
					>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.1, duration: 0.3 }}
							className="flex flex-col h-full"
						>
							{/* Header */}
							<motion.div
								initial={{ opacity: 0, y: -20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.15, duration: 0.3 }}
								className="flex items-center justify-between p-6 border-b"
							>
								<div>
									<h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
										{isEditMode ? "Edit Config" : "Create Config"}
									</h2>
									<p className="text-sm text-muted-foreground mt-1">
										Configure modules to generate SingBox configuration
									</p>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={onClose}
									className="hover:bg-destructive/10 hover:text-destructive transition-colors"
								>
									<IconX className="size-5" />
								</Button>
							</motion.div>

							{/* Content */}
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.2, duration: 0.4 }}
								className="flex-1 overflow-y-auto"
							>
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
											<LogConfigSection value={log} onChange={setLog} />

											<DnsConfigSection
												config={dnsConfig}
												onConfigChange={setDnsConfig}
												servers={dnsServers}
												onServersChange={setDnsServers}
												rules={dnsRules}
												onRulesChange={setDnsRules}
												final={dnsFinal}
												onFinalChange={setDnsFinal}
												isValid={isDnsValid}
											/>

											<InboundsConfigSection
												value={inbounds}
												onChange={setInbounds}
											/>

											<RouteConfigSection
												config={routeConfig}
												onConfigChange={setRouteConfig}
												rules={routeRules}
												onRulesChange={setRouteRules}
												final={routeFinal}
												onFinalChange={setRouteFinal}
												defaultDomainResolver={routeDefaultDomainResolver}
												onDefaultDomainResolverChange={setRouteDefaultDomainResolver}
												dnsServers={dnsServers}
												isValid={isRouteValid}
											/>

											<ExperimentalConfigSection
												value={experimental}
												onChange={setExperimental}
											/>


											<OtherConfigSection
												downloadDetour={downloadDetour}
												onDownloadDetourChange={setDownloadDetour}
											/>
										</Accordion>
									</div>
								</div>
							</motion.div>

							{/* Footer */}
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.25, duration: 0.3 }}
								className="flex items-center justify-between p-6 border-t bg-muted/30 backdrop-blur-sm"
							>
								<div className="text-sm text-muted-foreground">
									{isValid ? (
										<motion.span
											initial={{ scale: 0.8 }}
											animate={{ scale: 1 }}
											className="text-green-500 flex items-center gap-2"
										>
											<IconCheck className="size-4" />
											Ready to save
										</motion.span>
									) : (
										<span className="flex items-center gap-2">
											<IconAlertCircle className="size-4" />
											Please complete all required fields
										</span>
									)}
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										onClick={onClose}
										className="hover:bg-muted transition-colors"
									>
										Cancel
									</Button>
									<Button
										onClick={handleSave}
										disabled={!isValid}
										className="relative overflow-hidden group"
									>
										<span className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
										<IconDeviceFloppy className="size-4 mr-2" />
										Save Config
									</Button>
								</div>
							</motion.div>
						</motion.div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
