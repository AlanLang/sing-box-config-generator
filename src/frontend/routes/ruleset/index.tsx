import { AppPage } from "@/components/app-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/ruleset/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AppPage title="RuleSet">123</AppPage>;
}
