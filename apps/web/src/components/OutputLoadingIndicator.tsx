"use client";

import { useEffect, useState } from "react";

// ---------- phrases ----------
const NORMAL_PHRASES = ["Thinking…", "Generating…", "Processing…"];
const STALLED_PHRASES = ["Still working…", "Hang tight…", "Almost there…"];

// ---------- useTypewriter ----------
function useTypewriter(text: string, speed = 45): string {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return displayed;
}

// ---------- component ----------
interface OutputLoadingIndicatorProps {
  stalled?: boolean;
  visible: boolean;
}

export function OutputLoadingIndicator({ stalled = false, visible }: OutputLoadingIndicatorProps) {
  const phrases = stalled ? STALLED_PHRASES : NORMAL_PHRASES;

  const [phraseIdx, setPhraseIdx] = useState(0);

  // Reset to first phrase whenever stalled toggles
  useEffect(() => {
    setPhraseIdx(0);
  }, [stalled]);

  const currentPhrase = phrases[phraseIdx % phrases.length];
  const displayed = useTypewriter(currentPhrase, 48);

  // After the phrase is fully typed, wait 2 s then rotate to next
  useEffect(() => {
    if (displayed !== currentPhrase) return;
    const id = setTimeout(() => setPhraseIdx((n) => n + 1), 2000);
    return () => clearTimeout(id);
  }, [displayed, currentPhrase]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={currentPhrase}
      className="mt-1 flex items-center gap-2 select-none"
    >
      {/* Pulsing dots */}
      <span aria-hidden="true" className="flex items-center gap-[3px]">
        <span className="loading-dot inline-block h-1 w-1 rounded-full bg-orange opacity-60" />
        <span className="loading-dot inline-block h-1 w-1 rounded-full bg-orange opacity-60" />
        <span className="loading-dot inline-block h-1 w-1 rounded-full bg-orange opacity-60" />
      </span>

      {/* Typewriter text */}
      <span className={`text-[11px] tracking-wide ${stalled ? "text-pink" : "text-orange"}`}>
        {displayed}
      </span>

      {/* Blinking cursor that follows the typed text */}
      <span
        aria-hidden="true"
        className="loading-cursor inline-block h-[10px] w-[6px] rounded-sm bg-orange opacity-70"
      />
    </div>
  );
}
