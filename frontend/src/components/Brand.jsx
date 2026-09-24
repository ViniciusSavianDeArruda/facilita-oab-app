import { ScaleIcon } from "@heroicons/react/24/outline";

const SIZES = {
  sidebar: { icon: "h-4 w-4", text: "text-lg", gap: "gap-1.5" },
  mobile: { icon: "h-5 w-5", text: "text-xl", gap: "gap-2" },
  login: { icon: "h-5 w-5", text: "text-2xl", gap: "gap-2" },
};

export default function Brand({ size = "sidebar", showSymbol = true, showText = true, className = "" }) {
  const config = SIZES[size] || SIZES.sidebar;
  return (
    <div className={"inline-flex items-center " + config.gap + " " + className}>
      {showSymbol && <ScaleIcon className={config.icon + " shrink-0 text-brass"} aria-hidden="true" />}
      {showText && (
        <span className={"font-serif font-medium tracking-tight " + config.text} style={{ fontVariationSettings: '"opsz" 144' }}>
          <span className="text-cream-50">Facilita</span>
          <span className="ml-1 text-brass">OAB</span>
        </span>
      )}
    </div>
  );
}
