import {
  createLog,
  type LogCreateDto,
  logCreateSchema,
} from "@/api/log/create";
import { JsonEditor } from "@/components/json-editor";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";

export function LogAdd({
  onSuccess,
  onCancel,
}: {
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [json, setJson] = useState<string | undefined>("{}");
  const mutation = useMutation({
    mutationFn: createLog,
    onSuccess: () => {
      onSuccess?.();
    },
  });

  const form = useForm<LogCreateDto>({
    resolver: zodResolver(logCreateSchema),
    defaultValues: {
      name: "",
      uuid: uuidv4(),
      json: "{}",
    },
  });
  const onSubmit = (data: LogCreateDto) => {
    if (json === undefined) {
      return;
    }
    mutation.mutate({
      ...data,
      json: JSON.stringify(JSON.parse(json)),
    });
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="">
      <ResizablePanel>
        <JsonEditor defaultValue={json} onChange={(value) => setJson(value)} />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={40}>
        <form
          className="h-full p-4 flex flex-col justify-between"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                placeholder="Please enter you dns name"
                required
                {...form.register("name")}
              />
              <FieldError errors={Object.values(form.formState.errors)} />
            </Field>
          </FieldGroup>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || json === undefined}
            >
              Submit
            </Button>
          </div>
        </form>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
