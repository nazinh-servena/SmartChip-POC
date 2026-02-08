import { useState, useEffect } from "react";
import type { ComputeChipsRequest } from "@smartchip/types";
import type { IntentDef, ScenarioPreset } from "../App.js";

interface Props {
  intentDef: IntentDef;
  request: ComputeChipsRequest;
  onPresetSelect: (preset: ScenarioPreset) => void;
  onRequestChange: (r: ComputeChipsRequest) => void;
}

export function ScenarioBuilder({ intentDef, request, onPresetSelect, onRequestChange }: Props) {
  const [jsonText, setJsonText] = useState(JSON.stringify(request, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string>(intentDef.presets[0]?.name ?? "");

  // Sync JSON editor when request changes externally (preset selection, config changes)
  useEffect(() => {
    setJsonText(JSON.stringify(request, null, 2));
  }, [request]);

  // Reset active preset when intent changes
  useEffect(() => {
    setActivePreset(intentDef.presets[0]?.name ?? "");
  }, [intentDef.id]);

  function handlePreset(preset: ScenarioPreset) {
    setActivePreset(preset.name);
    setJsonError(null);
    onPresetSelect(preset);
  }

  function handleJsonChange(text: string) {
    setJsonText(text);
    setActivePreset("");
    try {
      const parsed = JSON.parse(text) as ComputeChipsRequest;
      setJsonError(null);
      onRequestChange(parsed);
    } catch (e) {
      setJsonError((e as Error).message);
    }
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">Scenario Builder</h2>

      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Presets for "{intentDef.label}"
        </h3>
        <div className="space-y-2">
          {intentDef.presets.map((p) => (
            <button
              key={p.name}
              onClick={() => handlePreset(p)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activePreset === p.name
                  ? "bg-purple-600/20 border border-purple-500 text-purple-300"
                  : "bg-slate-700 border border-transparent text-slate-400 hover:bg-slate-600"
              }`}
            >
              <div className="text-sm font-medium">{p.name}</div>
              <div className="text-xs text-slate-500">{p.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Full Request JSON
        </h3>
        <textarea
          value={jsonText}
          onChange={(e) => handleJsonChange(e.target.value)}
          spellCheck={false}
          className={`w-full h-56 bg-slate-900 text-slate-300 text-[11px] font-mono p-3 rounded-lg border resize-none focus:outline-none focus:ring-1 ${
            jsonError
              ? "border-red-500 focus:ring-red-500"
              : "border-slate-600 focus:ring-blue-500"
          }`}
        />
        {jsonError && (
          <p className="text-xs text-red-400 mt-1">{jsonError}</p>
        )}
      </div>
    </div>
  );
}
