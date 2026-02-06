import { useExperimentalList } from "@/api/experimental/list";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { SelectorDrawer } from "@/components/selector-drawer";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";

interface ExperimentalConfigSectionProps {
	value: string;
	onChange: (value: string) => void;
}

export function ExperimentalConfigSection({
	value,
	onChange,
}: ExperimentalConfigSectionProps) {
	const { data: experimentals, isLoading: experimentalsLoading } =
		useExperimentalList();

	return (
		<AccordionItem value="experimental">
			<AccordionTrigger className="hover:no-underline">
				<div className="flex items-center gap-3">
					{value ? (
						<IconCheck className="size-5 text-green-500" />
					) : (
						<IconAlertCircle className="size-5 text-destructive" />
					)}
					<span className="font-medium">
						Experimental Configuration
						<span className="text-destructive ml-1">*</span>
					</span>
					{value && experimentals && (
						<span className="text-sm text-muted-foreground ml-2">
							({experimentals.find((e) => e.uuid === value)?.name})
						</span>
					)}
				</div>
			</AccordionTrigger>
			<AccordionContent>
				<div className="pt-4 space-y-4">
					<p className="text-sm text-muted-foreground">
						Select an experimental configuration from your existing
						configurations.
					</p>

					{experimentalsLoading ? (
						<div className="text-sm text-muted-foreground">
							Loading experimental configs...
						</div>
					) : !experimentals || experimentals.length === 0 ? (
						<div className="p-4 border border-dashed rounded-lg text-center">
							<p className="text-sm text-muted-foreground">
								No experimental configurations found. Please create an
								experimental configuration first.
							</p>
						</div>
					) : (
						<SelectorDrawer
							drawerTitle="Select Experimental Configuration"
							drawerDescription="Choose an experimental configuration for this config."
							placeholder="Select an experimental configuration"
							items={experimentals.map((e) => ({
								value: e.uuid,
								title: e.name,
								description: e.json,
							}))}
							value={value}
							onSelect={onChange}
						/>
					)}
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
