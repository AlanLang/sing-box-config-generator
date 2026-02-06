import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	IconEdit,
	IconTrash,
	IconSettings,
	IconServer,
	IconRoute,
	IconCode,
	IconChevronRight,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import type { ConfigListDto } from "@/api/config/list";

interface ConfigRowProps {
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

export function ConfigRow({
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
}: ConfigRowProps) {
	return (
		<motion.div
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ delay: index * 0.05 }}
			className="group relative flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-6 rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/10 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
		>
			{/* 左侧：配置名称和基本信息 */}
			<div className="flex-shrink-0 sm:w-48 flex flex-col gap-2">
				<div className="flex items-center gap-3">
					<div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
						<IconSettings className="size-5 text-primary" />
					</div>
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold text-base sm:text-lg truncate group-hover:text-primary transition-colors">
							{config.name}
						</h3>
						<p className="text-xs text-muted-foreground">
							Config • {config.uuid.slice(0, 8)}
						</p>
					</div>
				</div>
			</div>

			{/* 中间：配置详情（桌面端显示） */}
			<div className="hidden lg:flex flex-1 gap-6">
				{/* Log 配置 */}
				<div className="flex-1 space-y-1.5">
					<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
						<IconCode className="size-3.5" />
						<span>Log</span>
					</div>
					<Badge variant="secondary" className="max-w-full truncate">
						{logName || config.log}
					</Badge>
				</div>

				{/* DNS 配置 */}
				<div className="flex-1 space-y-1.5">
					<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
						<IconServer className="size-3.5" />
						<span>DNS</span>
					</div>
					<div className="flex flex-col gap-1">
						{dnsConfigName && (
							<Badge
								variant="secondary"
								className="max-w-full truncate text-xs"
							>
								Config: {dnsConfigName}
							</Badge>
						)}
						<div className="flex items-center gap-1 flex-wrap">
							<span className="text-xs text-muted-foreground">
								{dnsServerNames.length} servers
							</span>
							{config.dns.rules && config.dns.rules.length > 0 && (
								<>
									<span className="text-xs text-muted-foreground">•</span>
									<span className="text-xs text-muted-foreground">
										{config.dns.rules.length} rules
									</span>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Inbounds */}
				<div className="flex-1 space-y-1.5">
					<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
						<IconRoute className="size-3.5" />
						<span>Inbounds</span>
					</div>
					<div className="flex flex-wrap gap-1">
						{inboundNames.slice(0, 2).map((name, idx) => (
							<Badge
								key={idx}
								variant="outline"
								className="text-xs max-w-[100px] truncate"
							>
								{name}
							</Badge>
						))}
						{inboundNames.length > 2 && (
							<Badge variant="outline" className="text-xs">
								+{inboundNames.length - 2}
							</Badge>
						)}
					</div>
				</div>

				{/* Route */}
				<div className="flex-1 space-y-1.5">
					<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
						<IconRoute className="size-3.5" />
						<span>Route</span>
					</div>
					<div className="flex flex-col gap-1">
						{routeConfigName && (
							<Badge
								variant="secondary"
								className="max-w-full truncate text-xs"
							>
								Config: {routeConfigName}
							</Badge>
						)}
						<div className="flex items-center gap-1">
							<span className="text-xs text-muted-foreground">
								Final: {routeFinalName || "..."}
							</span>
						</div>
					</div>
				</div>

				{/* Experimental */}
				{experimentalName && (
					<div className="flex-1 space-y-1.5">
						<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
							<IconCode className="size-3.5" />
							<span>Experimental</span>
						</div>
						<Badge variant="secondary" className="max-w-full truncate">
							{experimentalName}
						</Badge>
					</div>
				)}
			</div>

			{/* 中间：配置详情（移动端和平板显示） */}
			<div className="flex lg:hidden flex-1 flex-col sm:flex-row gap-3 sm:gap-4">
				<div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
					<div className="space-y-1">
						<p className="text-xs font-medium text-muted-foreground">Log</p>
						<Badge variant="secondary" className="text-xs truncate max-w-full">
							{logName?.slice(0, 10) || "..."}
						</Badge>
					</div>
					<div className="space-y-1">
						<p className="text-xs font-medium text-muted-foreground">DNS</p>
						<p className="text-xs text-foreground">
							{dnsServerNames.length} servers
						</p>
					</div>
					<div className="space-y-1">
						<p className="text-xs font-medium text-muted-foreground">
							Inbounds
						</p>
						<p className="text-xs text-foreground">{inboundNames.length}</p>
					</div>
					<div className="space-y-1">
						<p className="text-xs font-medium text-muted-foreground">Route</p>
						<p className="text-xs text-foreground truncate">
							{routeFinalName?.slice(0, 10) || "..."}
						</p>
					</div>
				</div>
			</div>

			{/* 右侧：操作按钮 */}
			<div className="flex sm:flex-col gap-2 sm:gap-2 justify-end sm:justify-center flex-shrink-0">
				<Button
					variant="ghost"
					size="sm"
					onClick={onEdit}
					className="gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
				>
					<IconEdit className="size-4" />
					<span className="hidden sm:inline">Edit</span>
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={onDelete}
					className="gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors"
				>
					<IconTrash className="size-4" />
					<span className="hidden sm:inline">Delete</span>
				</Button>
			</div>

			{/* 右侧角标 */}
			<div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:block">
				<IconChevronRight className="size-4 text-primary/60" />
			</div>

			{/* 底部渐变线 */}
			<div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/0 group-hover:via-primary/30 to-transparent transition-all duration-200" />
		</motion.div>
	);
}
