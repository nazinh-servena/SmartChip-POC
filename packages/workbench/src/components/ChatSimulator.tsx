import type { Chip, TraceEntry, ComputeChipsResponse } from "@smartchip/types";

interface Props {
  result: ComputeChipsResponse | null;
  botMessages: { withChips: string; noChips: string };
}

function ChatBubble({ message }: { message: string }) {
  return (
    <div className="flex gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
        AI
      </div>
      <div className="bg-slate-700 rounded-xl rounded-tl-sm px-4 py-2 max-w-[85%]">
        <p className="text-sm text-slate-200">{message}</p>
      </div>
    </div>
  );
}

function ChipButton({ chip }: { chip: Chip }) {
  return (
    <button
      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 border border-blue-500/40 text-blue-300 rounded-full text-sm font-medium hover:bg-blue-600/30 transition-colors"
      title={`Action: ${chip.action} | Priority: ${chip.priority}`}
    >
      {chip.label}
    </button>
  );
}

function TraceRow({ entry }: { entry: TraceEntry }) {
  return (
    <div className="flex items-start gap-2 text-xs font-mono leading-relaxed">
      <span className={entry.fired ? "text-green-400" : "text-slate-500"}>
        {entry.fired ? "+" : "-"}
      </span>
      <span className="text-slate-400">
        <span className={entry.fired ? "text-green-400" : "text-slate-500"}>
          {entry.module}
        </span>
        {" — "}
        {entry.reason}
      </span>
    </div>
  );
}

export function ChatSimulator({ result, botMessages }: Props) {
  const hasChips = result?.option === "success" && result.chips.length > 0;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 flex flex-col">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">Chat Simulator</h2>

      {/* Chat area */}
      <div className="bg-slate-900 rounded-lg p-4 mb-4 min-h-[200px] flex-1">
        {!result && (
          <p className="text-sm text-slate-600 italic">
            Configure a scenario and hit Simulate to see results...
          </p>
        )}

        {result?.option === "error" && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
            <p className="text-sm text-red-400">{result.error}</p>
          </div>
        )}

        {result?.option === "success" && (
          <>
            <ChatBubble
              message={hasChips ? botMessages.withChips : botMessages.noChips}
            />
            {hasChips && (
              <div className="flex flex-wrap gap-2 ml-9 mt-1">
                {result.chips.map((chip, i) => (
                  <ChipButton key={i} chip={chip} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Debug console */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Debug Trace
        </h3>
        <div className="bg-slate-900 rounded-lg p-3 space-y-1 min-h-[80px]">
          {!result && (
            <p className="text-xs text-slate-600 font-mono">Waiting for simulation...</p>
          )}
          {result?.trace.map((entry, i) => (
            <TraceRow key={i} entry={entry} />
          ))}
          {result?.option === "success" && (
            <div className="text-xs font-mono text-slate-600 mt-2 pt-2 border-t border-slate-800">
              Output: {result.chips.length} chip{result.chips.length !== 1 ? "s" : ""} returned
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
