import { IconCode } from "@tabler/icons-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface ConfigManagementCardProps {
	name: string;
	jsonPreview: string;
	onClick: () => void;
	index: number;
	uuid: string;
	actions?: ReactNode;
}

/**
 * Format JSON string for preview with better readability
 * - No truncation, allow scrolling for full content
 * - Preserve formatting for horizontal scroll
 */
function formatJsonPreview(jsonStr: string): string {
	try {
		return JSON.stringify(JSON.parse(jsonStr), null, 2);
	} catch {
		return jsonStr;
	}
}

/**
 * Specialized card component for Config Management page
 * Features improved JSON readability with horizontal scrolling and top-aligned action buttons
 */
export function ConfigManagementCard({
	name,
	jsonPreview,
	onClick,
	index,
	actions,
}: ConfigManagementCardProps) {
	const formattedPreview = formatJsonPreview(jsonPreview);

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

				{/* JSON Preview with Horizontal Scroll */}
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
					{/* Code block container with editor styling */}
					<div className="flex flex-col rounded-lg bg-muted/30 group-hover:bg-muted/40 transition-all duration-150 border-t border-border/20 m-3 sm:m-4 overflow-hidden">
						{/* Editor header bar */}
						<div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/30 bg-muted/40 flex-shrink-0">
							<div className="w-2 h-2 rounded-full bg-red-500/60" />
							<div className="w-2 h-2 rounded-full bg-yellow-500/60" />
							<div className="w-2 h-2 rounded-full bg-green-500/60" />
							<span className="ml-2 text-xs text-muted-foreground/70 font-medium">
								config.json
							</span>
							<span className="ml-auto text-[10px] text-muted-foreground/50 font-medium hidden sm:inline">
								Click to edit · Scroll horizontally →
							</span>
						</div>

						{/* Code content with horizontal scroll */}
						<div className="relative overflow-x-auto overflow-y-hidden max-h-64 scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-transparent hover:scrollbar-thumb-border/60">
							<pre className="text-xs font-mono text-muted-foreground/80 group-hover:text-muted-foreground leading-relaxed transition-all duration-150 p-4 min-w-max">
								{formattedPreview}
							</pre>
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
