import {
  createRuleset,
  type RulesetCreateDto,
  rulesetCreateSchema,
} from "@/api/ruleset/create";
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
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

interface RulesetFormProps {
  mode: "create" | "edit";
  initialData?: {
    uuid: string;
    name: string;
    json: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
  onUpdate?: (data: { uuid: string; name: string; json: string }) => void;
}

export function RulesetForm({
  mode,
  initialData,
  onSuccess,
  onCancel,
  onUpdate,
}: RulesetFormProps) {
  const [json, setJson] = useState<string | undefined>(
    initialData?.json || "{}",
  );

  const createMutation = useMutation({
    mutationFn: createRuleset,
    onSuccess: () => {
      toast.success("Ruleset created successfully");
      onSuccess?.();
    },
  });

  const form = useForm<RulesetCreateDto>({
    resolver: zodResolver(rulesetCreateSchema),
    defaultValues: {
      name: initialData?.name || "",
      uuid: initialData?.uuid || uuidv4(),
      json: initialData?.json || "{}",
    },
  });

  // Update json when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      form.reset({
        uuid: initialData.uuid,
        name: initialData.name,
        json: initialData.json,
      });
      setJson(initialData.json);
    }
  }, [initialData, form]);

  const onSubmit = (data: RulesetCreateDto) => {
    if (json === undefined) {
      toast.error("Invalid JSON");
      return;
    }

    try {
      // Validate JSON
      JSON.parse(json);

      if (mode === "create") {
        createMutation.mutate({
          ...data,
          json: JSON.stringify(JSON.parse(json)),
        });
      } else {
        // For edit mode, call onUpdate
        onUpdate?.({
          uuid: data.uuid,
          name: data.name,
          json: JSON.stringify(JSON.parse(json)),
        });
      }
    } catch (_e) {
      toast.error("Invalid JSON format");
    }
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel>
        <JsonEditor defaultValue={json} onChange={(value) => setJson(value)} />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={40} minSize={30}>
        <form
          className="h-full p-6 flex flex-col justify-between"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Ruleset Name</FieldLabel>
              <Input
                id="name"
                placeholder="Enter ruleset name"
                required
                {...form.register("name")}
              />
              <FieldError errors={Object.values(form.formState.errors)} />
            </Field>
            {mode === "edit" && (
              <Field>
                <FieldLabel htmlFor="uuid">UUID</FieldLabel>
                <Input
                  id="uuid"
                  disabled
                  className="bg-muted"
                  {...form.register("uuid")}
                />
              </Field>
            )}
          </FieldGroup>
          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || json === undefined}
            >
              {mode === "create" ? "Create" : "Save"}
            </Button>
          </div>
        </form>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
