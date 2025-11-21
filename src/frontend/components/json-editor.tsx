import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OnChange, OnMount } from "@monaco-editor/react";
import Editor from "@monaco-editor/react";
import { IconAlertSquareRounded, IconClipboard, IconCode } from "@tabler/icons-react";
import { useImperativeHandle, useRef, useState } from "react";
import { ButtonGroup } from "./ui/button-group";

export interface JsonEditorInstance {
  setValue: (value: string) => void;
  format: () => void;
}

interface JsonEditorProps {
  value?: string;
  defaultValue?: string;
  onChange?: OnChange;
  ref?: React.RefObject<JsonEditorInstance | null>;
  onMount?: (editor: Parameters<OnMount>[0]) => void;
  className?: string;
}


export function JsonEditor({ value, defaultValue, onChange, ref, onMount, className }: JsonEditorProps) {
  const theme = localStorage.getItem('theme');
  const [alertErrorMsg, setAlertErrorMsg] = useState<string>("");
  const isDark = theme === 'dark';
  const editorRef = useRef<Parameters<OnMount>[0]>(null);

  const formatJson = () => {
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  };

  const copyJson = () => {
    editorRef.current?.getAction("editor.action.clipboardCopyAction")?.run();
  };

  const handleChange: OnChange = (value, event) => {
    if (value && isJsonValid(value)) {
      setAlertErrorMsg("");
      onChange?.(value, event);
    } else {
      setAlertErrorMsg("Invalid JSON format.");
      onChange?.(undefined, event);
    }
  };


  useImperativeHandle(ref, () => ({
    format: formatJson,
    setValue: (value: string) => {
      editorRef.current?.setValue(value);
    },
  }));

  return (
    <div className={cn("flex flex-col h-full gap-2 p-4", className)}>
      <Editor
        options={{
          tabSize: 2,
          insertSpaces: true,
        }}
        theme={isDark ? 'vs-dark' : 'light'}
        height="100%"
        width="100%"
        defaultLanguage="json"
        value={value}
        defaultValue={defaultValue}
        onMount={(editor) => {
          editorRef.current = editor;
          onMount?.(editor);
        }}
        onChange={handleChange}
      />
      {alertErrorMsg ? <Alert variant="destructive">
        <IconAlertSquareRounded />
        <AlertTitle>{alertErrorMsg}</AlertTitle>
      </Alert> : <div className="flex justify-end px-4">
        <ButtonGroup>
          <Button variant="outline" size="sm" onClick={formatJson}>
            <IconCode />
          </Button>
          <Button variant="outline" size="sm" onClick={copyJson}>
            <IconClipboard />
          </Button>
        </ButtonGroup>
      </div>}
    </div>
  );
}

export function isJsonValid(json: string) {
  try {
    JSON.parse(json);
    return true;
  } catch (error) {
    return false;
  }
}