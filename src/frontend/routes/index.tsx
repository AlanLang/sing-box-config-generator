import { AppPage } from "@/components/app-page";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <AppPage
      title="Config"
      actions={
        <Button className="size-8" variant="outline">
          <IconPlus />
        </Button>
      }
    >
      123
    </AppPage>
  );
}
