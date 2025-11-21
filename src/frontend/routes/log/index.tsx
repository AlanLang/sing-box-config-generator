import { AppPage } from "@/components/app-page";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { IconPlus } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LogAdd } from "./components/log-add";

export const Route = createFileRoute("/log/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [open, setOpen] = useState(false);

  return (
    <AppPage
      title="Log"
      actions={
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button className="size-8">
              <IconPlus />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-full min-h-[90vh] max-h-[90vh]">
            <LogAdd
              onSuccess={() => {
                setOpen(false);
              }}
            />
          </DrawerContent>
        </Drawer>
      }
    >
      123
    </AppPage>
  );
}
