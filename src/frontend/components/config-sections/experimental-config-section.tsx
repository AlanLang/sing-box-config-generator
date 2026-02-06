import { useExperimentalList } from "@/api/experimental/list";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { SelectorDrawer } from "@/components/selector-drawer";
import { IconAlertCircle, IconCheck, IconSelector } from "@tabler/icons-react";
import { useState } from "react";

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
	const [drawerOpen, setDrawerOpen] = useState(false);

	const selectedExperimental = experimentals?.find((e) => e.uuid === value);

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
					{selectedExperimental && (
						<span className="text-sm text-muted-foreground ml-2">
							({selectedExperimental.name})
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
						<>
							<Button
								variant="outline"
								className="w-full justify-between"
								onClick={() => setDrawerOpen(true)}
							>
								<span
									className={
										selectedExperimental ? "" : "text-muted-foreground"
									}
								>
									{selectedExperimental?.name ||
										"Select an experimental configuration"}
								</span>
								<IconSelector className="size-4 text-muted-foreground" />
							</Button>

							<SelectorDrawer
								open={drawerOpen}
								onOpenChange={setDrawerOpen}
								title="Select Experimental Configuration"
								description="Choose an experimental configuration for this config."
								items={experimentals}
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
