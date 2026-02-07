import { IconCode } from "@tabler/icons-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface ConfigManagementCardProps {
	name: string;
	uuid: string;
	updatedAt?: number;
	onClick: () => void;
	index: number;
	actions?: ReactNode;
}

/**
 * Format timestamp to readable date string
 */
function formatUpdatedAt(timestamp?: number): string {
	if (!timestamp) return "Unknown";
	const date = new Date(timestamp * 1000);
	return date.toLocaleString("zh-CN", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/**
 * Specialized card component for Config Management page
 * Displays UUID and last updated time instead of full JSON preview
 */
export function ConfigManagementCard({
	name,
	uuid,
	updatedAt,
	onClick,
	index,
	actions,
}: ConfigManagementCardProps) {

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.05 }}
		>
			<motion.div
				className="relative rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/20 shadow-md shadow-black/5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-150 overflow-hidden w-full group"
				whileHover={{ scale: 1.002, y: -2 }}
				transition={{ duration: 0.15 }}
			>
				{/* Gradient overlay */}
				<div className="absolute inset-0 bg-gradient-to-br from-primary/[0.05] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none" />

				{/* Subtle pattern overlay */}
				<div
					className="absolute inset-0 opacity-[0.015] group-hover:opacity-[0.03] transition-opacity duration-150 pointer-events-none"
					style={{
						backgroundImage:
							"radial-gradient(circle at 2px 2px, currentColor 1px, transparent 1px)",
						backgroundSize: "24px 24px",
					}}
				/>

				{/* Header with Title and Actions */}
				<div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 border-b border-border/50 bg-gradient-to-r from-background/50 to-transparent">
					{/* Left: Icon + Title */}
					<button
						type="button"
						onClick={onClick}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onClick();
							}
						}}
						className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer group/title w-full sm:w-auto"
					>
						<div className="relative flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-all duration-150">
							<IconCode className="size-5 text-primary/70 group-hover:text-primary transition-all duration-150" />
						</div>
						<div className="flex-1 min-w-0">
							<h3 className="font-semibold text-lg sm:text-xl truncate group-hover/title:text-primary transition-all duration-150">
								{name}
							</h3>
							<p className="text-xs sm:text-sm text-muted-foreground">
								SingBox Configuration
							</p>
						</div>
					</button>

					{/* Right: Action Buttons */}
					{actions && (
						<div
							className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity duration-150 self-end sm:self-auto"
							onClick={(e) => e.stopPropagation()}
							onKeyDown={(e) => e.stopPropagation()}
						>
							{actions}
						</div>
					)}
				</div>

				{/* Metadata Preview */}
				<button
					type="button"
					className="relative w-full text-left cursor-pointer"
					onClick={onClick}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							onClick();
						}
					}}
				>
					{/* Info block container */}
					<div className="flex flex-col rounded-lg bg-muted/30 group-hover:bg-muted/40 transition-all duration-150 border-t border-border/20 m-3 sm:m-4">
						{/* Header bar */}
						<div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/30 bg-muted/40 flex-shrink-0">
							<div className="w-2 h-2 rounded-full bg-red-500/60" />
							<div className="w-2 h-2 rounded-full bg-yellow-500/60" />
							<div className="w-2 h-2 rounded-full bg-green-500/60" />
							<span className="ml-2 text-xs text-muted-foreground/70 font-medium">
								Metadata
							</span>
							<span className="ml-auto text-[10px] text-muted-foreground/50 font-medium hidden sm:inline">
								Click to edit
							</span>
						</div>

						{/* Metadata content */}
						<div className="p-4 space-y-2">
							<div className="flex items-start gap-2">
								<span className="text-xs font-medium text-muted-foreground/60 min-w-[80px]">
									UUID:
								</span>
								<span className="text-xs font-mono text-muted-foreground/90 break-all">
									{uuid}
								</span>
							</div>
							<div className="flex items-start gap-2">
								<span className="text-xs font-medium text-muted-foreground/60 min-w-[80px]">
									Updated:
								</span>
								<span className="text-xs text-muted-foreground/90">
									{formatUpdatedAt(updatedAt)}
								</span>
							</div>
						</div>
					</div>

					{/* Subtle vertical gradient overlay at bottom */}
					<div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background/80 via-background/20 to-transparent pointer-events-none" />
				</button>

				{/* Bottom edge accent */}
				<div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/0 group-hover:via-primary/50 to-transparent transition-all duration-150" />
			</motion.div>
		</motion.div>
	);
}
