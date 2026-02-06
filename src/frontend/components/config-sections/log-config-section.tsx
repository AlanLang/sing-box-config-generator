import { useLogList } from "@/api/log/list";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { SelectorDrawer } from "@/components/selector-drawer";
import { IconAlertCircle, IconCheck, IconSelector } from "@tabler/icons-react";
import { useState } from "react";

interface LogConfigSectionProps {
	value: string;
	onChange: (value: string) => void;
}

export function LogConfigSection({ value, onChange }: LogConfigSectionProps) {
	const { data: logs, isLoading: logsLoading } = useLogList();
	const [drawerOpen, setDrawerOpen] = useState(false);

	const selectedLog = logs?.find((l) => l.uuid === value);

	return (
		<AccordionItem value="log">
			<AccordionTrigger className="hover:no-underline">
				<div className="flex items-center gap-3">
					{value ? (
						<IconCheck className="size-5 text-green-500" />
					) : (
						<IconAlertCircle className="size-5 text-destructive" />
					)}
					<span className="font-medium">
						LOG Configuration
						<span className="text-destructive ml-1">*</span>
					</span>
					{selectedLog && (
						<span className="text-sm text-muted-foreground ml-2">
							({selectedLog.name})
						</span>
					)}
				</div>
			</AccordionTrigger>
			<AccordionContent>
				<div className="pt-4 space-y-4">
					<p className="text-sm text-muted-foreground">
						Select a log configuration from your existing log configurations.
					</p>

					{logsLoading ? (
						<div className="text-sm text-muted-foreground">Loading logs...</div>
					) : !logs || logs.length === 0 ? (
						<div className="p-4 border border-dashed rounded-lg text-center">
							<p className="text-sm text-muted-foreground">
								No log configurations found. Please create a log configuration
								first.
							</p>
						</div>
					) : (
						<>
							<Button
								variant="outline"
								className="w-full justify-between"
								onClick={() => setDrawerOpen(true)}
							>
								<span className={selectedLog ? "" : "text-muted-foreground"}>
									{selectedLog?.name || "Select a log configuration"}
								</span>
								<IconSelector className="size-4 text-muted-foreground" />
							</Button>

							<SelectorDrawer
								open={drawerOpen}
								onOpenChange={setDrawerOpen}
								title="Select Log Configuration"
								description="Choose a log configuration for this config."
								items={logs}
								value={value}
								onSelect={onChange}
							/>
						</>
					)}
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
