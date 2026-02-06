import { useLogList } from "@/api/log/list";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";

interface LogConfigSectionProps {
	value: string;
	onChange: (value: string) => void;
}

export function LogConfigSection({ value, onChange }: LogConfigSectionProps) {
	const { data: logs, isLoading: logsLoading } = useLogList();

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
					{value && logs && (
						<span className="text-sm text-muted-foreground ml-2">
							({logs.find((l) => l.uuid === value)?.name})
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
						<RadioGroup value={value || undefined} onValueChange={onChange}>
							<div className="space-y-2">
								{logs.map((logItem) => (
									<div
										key={logItem.uuid}
										className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
									>
										<RadioGroupItem
											value={logItem.uuid}
											id={`log-${logItem.uuid}`}
										/>
										<Label
											htmlFor={`log-${logItem.uuid}`}
											className="flex-1 cursor-pointer"
										>
											<div className="font-medium">{logItem.name}</div>
											<div className="text-sm text-muted-foreground line-clamp-1">
												{logItem.json.substring(0, 100)}
												{logItem.json.length > 100 && "..."}
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
	);
}
