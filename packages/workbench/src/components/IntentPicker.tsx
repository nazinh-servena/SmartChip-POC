import type { IntentDef, IntentId } from "../App.js";

interface Props {
  intents: IntentDef[];
  selected: IntentId;
  onSelect: (id: IntentId) => void;
}

const INTENT_ICONS: Record<IntentId, string> = {
  product_discovery: "search",
  track_order: "package",
  checkout_help: "cart",
  check_policy: "info",
};

const INTENT_COLORS: Record<IntentId, { bg: string; border: string; text: string }> = {
  product_discovery: { bg: "bg-blue-600/20", border: "border-blue-500", text: "text-blue-300" },
  track_order: { bg: "bg-amber-600/20", border: "border-amber-500", text: "text-amber-300" },
  checkout_help: { bg: "bg-green-600/20", border: "border-green-500", text: "text-green-300" },
  check_policy: { bg: "bg-purple-600/20", border: "border-purple-500", text: "text-purple-300" },
};

function IntentIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    search: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z",
    package: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    cart: "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z",
    info: "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z",
  };
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d={icons[type] || icons.search} />
    </svg>
  );
}

export function IntentPicker({ intents, selected, onSelect }: Props) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        Intent (The Router)
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {intents.map((intent) => {
          const active = selected === intent.id;
          const colors = INTENT_COLORS[intent.id];
          return (
            <button
              key={intent.id}
              onClick={() => onSelect(intent.id)}
              className={`text-left px-4 py-3 rounded-lg transition-all border ${
                active
                  ? `${colors.bg} ${colors.border} ${colors.text}`
                  : "bg-slate-700/50 border-transparent text-slate-400 hover:bg-slate-700"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <IntentIcon type={INTENT_ICONS[intent.id]} />
                <span className="text-sm font-semibold">{intent.label}</span>
              </div>
              <div className="text-xs opacity-70">{intent.description}</div>
              {active && (
                <div className="mt-2 text-[10px] font-mono opacity-60">
                  Module: {intent.module}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
