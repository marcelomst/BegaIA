// Path: /root/begasist/components/admin/ModelSelector.tsx
"use client";


import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { CurationModel } from "@/types/channel";

export interface ModelSelectorProps {
  hotelId: string;
  current: CurationModel;
  onChange: (newModel: CurationModel) => void;
}

const MODEL_LABELS: Record<CurationModel, string> = {
  "gpt-3.5-turbo": "GPT-3.5 Turbo",
  "gpt-4": "GPT-4",
  "gpt-4o": "GPT-4o",
};

export default function ModelSelector({ current, onChange }: ModelSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Modelo IA:</span>
      <Select value={current} onValueChange={(v: string) => onChange(v as CurationModel)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(MODEL_LABELS).map(([model, label]) => (
            <SelectItem key={model} value={model}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
