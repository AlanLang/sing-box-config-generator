import { AppPage } from "@/components/app-page";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { IconPlus } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { LogAdd } from "./components/log-add";

export const Route = createFileRoute("/log/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <AppPage
      title="Log"
      actions={
        <Drawer>
          <DrawerTrigger asChild>
            <Button className="size-8" variant="outline">
              <IconPlus />
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <LogAdd />
          </DrawerContent>
        </Drawer>
      }
    >
      123
    </AppPage>
  );
}
