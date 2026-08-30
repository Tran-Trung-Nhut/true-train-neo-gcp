"use client";

import { Volume2 } from "lucide-react";
import { speak } from "@/lib/speak";
import { iconBtn } from "./ui";

export default function SpeakButton({
  text,
  size = 26,
  radius = 7,
  iconSize = 14,
}: {
  text: string;
  size?: number;
  radius?: number;
  iconSize?: number;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      aria-label={`speak ${text}`}
      title="read aloud"
      style={{ ...iconBtn(size, radius), flex: "none" }}
    >
      <Volume2 size={iconSize} />
    </button>
  );
}
