import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	IconEdit,
	IconTrash,
	IconSettings,
	IconServer,
	IconRoute,
	IconCode,
	IconWifi,
	IconArrowRight,
	IconBox,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import type { ConfigListDto } from "@/api/config/list";

interface ConfigCardProps {
	config: ConfigListDto;
	index: number;
	onEdit: () => void;
	onDelete: () => void;
	// 名称映射
	logName?: string;
	dnsConfigName?: string;
	dnsServerNames: string[];
	inboundNames: string[];
	routeConfigName?: string;
	routeFinalName?: string;
	experimentalName?: string;
}

export function ConfigCard({
	config,
	index,
	onEdit,
	onDelete,
	logName,
	dnsConfigName,
	dnsServerNames,
	inboundNames,
	routeConfigName,
	routeFinalName,
	experimentalName,
}: ConfigCardProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.05 }}
			className="group relative"
		>
			<div className="relative h-full rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/20 shadow-lg shadow-black/5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 overflow-hidden">
				{/* 顶部装饰渐变 */}
				<div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0" />

				{/* 卡片头部 */}
				<div className="relative p-6 border-b border-border/50">
					<div className="flex items-start justify-between gap-4">
						<div className="flex items-start gap-4 flex-1 min-w-0">
							{/* 图标 */}
							<div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-colors">
								<IconSettings className="size-6 text-primary" />
							</div>
							{/* 名称和描述 */}
							<div className="flex-1 min-w-0">
								<h3 className="font-semibold text-xl mb-1 truncate group-hover:text-primary transition-colors">
									{config.name}
								</h3>
								<p className="text-sm text-muted-foreground">
									Configuration Profile • {config.uuid.slice(0, 8)}...
								</p>
							</div>
						</div>
						{/* 操作按钮 */}
						<div className="flex gap-2 flex-shrink-0">
							<Button
								variant="ghost"
								size="icon"
								onClick={onEdit}
								className="hover:bg-primary/10 hover:text-primary transition-colors"
							>
								<IconEdit className="size-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={onDelete}
								className="hover:bg-destructive/10 hover:text-destructive transition-colors"
							>
								<IconTrash className="size-4" />
							</Button>
						</div>
					</div>
				</div>

				{/* 卡片内容 */}
				<div className="p-6 space-y-5">
					{/* Log 配置 */}
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
							<div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
								<IconCode className="size-4 text-blue-500" />
							</div>
							<span>Log Configuration</span>
						</div>
						<div className="pl-10">
							<Badge
								variant="secondary"
								className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
							>
								{logName || config.log}
							</Badge>
						</div>
					</div>

					{/* DNS 配置 */}
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
							<div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
								<IconServer className="size-4 text-green-500" />
							</div>
							<span>DNS Configuration</span>
						</div>
						<div className="pl-10 space-y-2">
							{dnsConfigName && (
								<div className="flex items-center gap-2">
									<span className="text-xs text-muted-foreground">Base:</span>
									<Badge
										variant="outline"
										className="bg-green-500/5 text-green-700 dark:text-green-400 border-green-500/20"
									>
										{dnsConfigName}
									</Badge>
								</div>
							)}
							<div className="flex items-center gap-3 flex-wrap">
								<div className="flex items-center gap-1.5 text-sm">
									<IconWifi className="size-3.5 text-green-500" />
									<span className="text-muted-foreground">
										{dnsServerNames.length} server
										{dnsServerNames.length !== 1 ? "s" : ""}
									</span>
								</div>
								{config.dns.rules && config.dns.rules.length > 0 && (
									<div className="flex items-center gap-1.5 text-sm">
										<IconArrowRight className="size-3.5 text-green-500" />
										<span className="text-muted-foreground">
											{config.dns.rules.length} rule
											{config.dns.rules.length !== 1 ? "s" : ""}
										</span>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Inbounds 配置 */}
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
							<div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
								<IconBox className="size-4 text-purple-500" />
							</div>
							<span>Inbounds ({inboundNames.length})</span>
						</div>
						<div className="pl-10">
							<div className="flex flex-wrap gap-2">
								{inboundNames.slice(0, 3).map((name, idx) => (
									<Badge
										key={idx}
										variant="outline"
										className="bg-purple-500/5 text-purple-700 dark:text-purple-400 border-purple-500/20"
									>
										{name}
									</Badge>
								))}
								{inboundNames.length > 3 && (
									<Badge
										variant="outline"
										className="bg-purple-500/5 text-purple-700 dark:text-purple-400 border-purple-500/20"
									>
										+{inboundNames.length - 3} more
									</Badge>
								)}
							</div>
						</div>
					</div>

					{/* Route 配置 */}
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
							<div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
								<IconRoute className="size-4 text-orange-500" />
							</div>
							<span>Route Configuration</span>
						</div>
						<div className="pl-10 space-y-2">
							{routeConfigName && (
								<div className="flex items-center gap-2">
									<span className="text-xs text-muted-foreground">Base:</span>
									<Badge
										variant="outline"
										className="bg-orange-500/5 text-orange-700 dark:text-orange-400 border-orange-500/20"
									>
										{routeConfigName}
									</Badge>
								</div>
							)}
							<div className="flex items-center gap-2">
								<span className="text-xs text-muted-foreground">Final:</span>
								<Badge
									variant="secondary"
									className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20"
								>
									{routeFinalName || "Not set"}
								</Badge>
							</div>
							{config.route.rules && config.route.rules.length > 0 && (
								<div className="flex items-center gap-1.5 text-sm">
									<IconArrowRight className="size-3.5 text-orange-500" />
									<span className="text-muted-foreground">
										{config.route.rules.length} routing rule
										{config.route.rules.length !== 1 ? "s" : ""}
									</span>
								</div>
							)}
						</div>
					</div>

					{/* Experimental 配置 */}
					{experimentalName && (
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
								<div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
									<IconCode className="size-4 text-pink-500" />
								</div>
								<span>Experimental</span>
							</div>
							<div className="pl-10">
								<Badge
									variant="secondary"
									className="bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20"
								>
									{experimentalName}
								</Badge>
							</div>
						</div>
					)}
				</div>

				{/* 卡片底部装饰 */}
				<div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/0 group-hover:via-primary/40 to-transparent transition-all duration-300" />
			</div>
		</motion.div>
	);
}
