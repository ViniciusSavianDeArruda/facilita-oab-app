import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const ChatComposer = forwardRef(function ChatComposer(
  {
    onSend,
    onCancel,
    disabled,
    streaming,
    placeholder = "Sua dúvida jurídica...",
  },
  ref,
) {
  const [input, setInput] = useState("");
  const textareaRef = useRef(null);

  useImperativeHandle(ref, () => ({
    // Preenche o campo sem enviar — usado pelas sugestões da tela vazia.
    fillInput(text) {
      setInput(text);
      textareaRef.current?.focus();
    },
  }));

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  function handleSend() {
    const content = input.trim();
    if (!content || disabled) return;
    setInput("");
    onSend(content);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-ink-800 bg-ink-950/80 backdrop-blur px-6 md:px-8 py-4">
      <div className="max-w-[800px] mx-auto">
        <div className="flex items-end gap-3 bg-ink-900 border border-ink-800 rounded-2xl px-4 py-3 focus-within:border-brass-dim transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none placeholder:text-cream-600 text-cream-50 leading-relaxed py-1"
            disabled={disabled}
          />
          {streaming ? (
            <button
              onClick={onCancel}
              className="shrink-0 h-9 w-9 rounded-full bg-ink-800 hover:bg-ink-700 text-cream-400 flex items-center justify-center transition-colors"
              aria-label="Parar"
              title="Parar"
            >
              <StopIcon />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 h-9 w-9 rounded-full bg-brass hover:bg-brass-hover disabled:bg-ink-800 disabled:text-cream-600 text-ink-950 flex items-center justify-center transition-colors"
              aria-label="Enviar"
              title="Enviar (Enter)"
            >
              <ArrowIcon />
            </button>
          )}
        </div>
        <p className="text-xs text-cream-600 mt-2 px-1">
          Enter envia · Shift+Enter quebra linha · o mentor pode errar em
          jurisprudência específica, sempre confira números de súmula.
        </p>
      </div>
    </div>
  );
});

export default ChatComposer;

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2L8 14M8 2L3 7M8 2L13 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <rect x="2" y="2" width="8" height="8" rx="1.5" />
    </svg>
  );
}
