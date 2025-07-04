import { useEffect, useState } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number; // ms per char
  className?: string;
  onDone?: () => void;
}

export default function TypewriterText({ text, speed = 22, className = "", onDone }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let idx = 0;
    setDisplayed("");
    if (!text) return;
    const interval = setInterval(() => {
      idx++;
      setDisplayed(text.slice(0, idx));
      if (idx >= text.length) {
        clearInterval(interval);
        if (onDone) onDone();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return <span className={className} style={{whiteSpace:'pre-line'}}>{displayed}</span>;
}
