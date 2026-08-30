"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { parseSegs } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Logo, mono, panel } from "../shared/ui";

type VoiceRole = "ai" | "user";

interface VoiceMessage {
  role: VoiceRole;
  text: string;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0?: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorLike {
  error?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function speechText(text: string): string {
  return text.replace(/\[([^\]]+)\]/g, "$1").replace(/\s+/g, " ").trim();
}

export default function SpeakingPractice() {
  const decks = useStore((s) => s.decks);
  const activeDeckId = useStore((s) => s.activeDeckId);
  const studyCards = useStore((s) => s.studyCards);

  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [status, setStatus] = useState("Ready to practise speaking.");
  const [recognitionSupported, setRecognitionSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const deck = decks.find((d) => d.id === activeDeckId) ?? decks[0];
  const context = useMemo(
    () => ({
      deckName: deck?.name ?? "",
      deckLevel: deck?.level ?? "",
      targetWords: studyCards.slice(0, 10).map((card) => ({
        word: card.word,
        pos: card.pos,
        defEn: card.defEn,
        defOrigin: card.defOrigin,
        example: card.exEn,
      })),
    }),
    [deck?.level, deck?.name, studyCards]
  );

  useEffect(() => {
    setRecognitionSupported(Boolean(getSpeechRecognition()));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isSending]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopSpeech = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      stopSpeech();
      const utterance = new SpeechSynthesisUtterance(speechText(text));
      utterance.lang = "en-US";
      utterance.rate = 0.94;
      utterance.pitch = 1;
      utterance.onstart = () => {
        setIsSpeaking(true);
        setStatus("The AI is speaking. Listen, then reply.");
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setStatus("Your turn - reply in English.");
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setStatus("Could not play the reply aloud, but you can read it below.");
      };
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [stopSpeech]
  );

  const callCoach = useCallback(
    async (requestMessages: VoiceMessage[], visibleHistory: VoiceMessage[]) => {
      setMessages(visibleHistory);
      setIsSending(true);
      setStatus("The AI is preparing a reply...");

      try {
        const res = await fetch("/api/ai/speaking", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: requestMessages, context }),
        });

        if (res.status === 429) {
          const d = await res.json().catch(() => ({ limit: 20 }));
          const reply = `You have used all ${d.limit ?? 20} AI speaking turns for today. Come back tomorrow.`;
          setMessages([...visibleHistory, { role: "ai", text: reply }]);
          setStatus("No AI credits left today.");
          return;
        }

        if (!res.ok) throw new Error("speaking_error");

        const d = await res.json();
        const reply = typeof d.reply === "string" && d.reply.trim() ? d.reply.trim() : "Can you say that again?";
        setMessages([...visibleHistory, { role: "ai", text: reply }]);
        setStatus("The AI replied. When it finishes, tap the mic to keep going.");
        speak(reply);
      } catch {
        const reply = "I did not catch that, or the connection dropped. Try again with a short sentence.";
        setMessages([...visibleHistory, { role: "ai", text: reply }]);
        setStatus("Connection error. Please try again.");
      } finally {
        setIsSending(false);
      }
    },
    [context, speak]
  );

  const sendUserTurn = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean || isSending) return;
      stopSpeech();
      const visibleHistory: VoiceMessage[] = [...messages, { role: "user", text: clean }];
      void callCoach(visibleHistory, visibleHistory);
    },
    [callCoach, isSending, messages, stopSpeech]
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setRecognitionSupported(false);
      setStatus("This browser does not support speech recognition. Try Chrome or Edge.");
      return;
    }
    if (isListening || isSending) return;

    stopSpeech();
    setInterimText("");

    const recognition = new Recognition();
    let finalText = "";
    let bestText = "";
    let hadError = false;

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus("Listening. Say a short English sentence.");
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript ?? "";
        if (!transcript) continue;
        bestText = transcript;
        if (result.isFinal) finalText += `${transcript} `;
        else interim += transcript;
      }
      setInterimText((finalText + interim).trim());
    };

    recognition.onerror = (event) => {
      hadError = true;
      const blocked = event.error === "not-allowed" || event.error === "service-not-allowed";
      setStatus(blocked ? "Microphone access is required for speaking practice." : "Did not catch that. Try again a little slower.");
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      const transcript = (finalText || bestText).trim();
      setInterimText("");
      if (transcript) {
        sendUserTurn(transcript);
      } else if (!hadError) {
        setStatus("I did not hear anything. Tap the mic and try again.");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, isSending, sendUserTurn, stopSpeech]);

  useEffect(() => {
    const handleSpaceToTalk = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if (event.code !== "Space" || event.repeat || isSending || !recognitionSupported) return;

      event.preventDefault();
      if (isListening) stopListening();
      else startListening();
    };

    window.addEventListener("keydown", handleSpaceToTalk);
    return () => window.removeEventListener("keydown", handleSpaceToTalk);
  }, [isListening, isSending, recognitionSupported, startListening, stopListening]);

  const avatarState = isListening ? "listening" : isSpeaking ? "speaking" : isSending ? "thinking" : "idle";
  const micLabel = isListening ? "Stop listening" : "Start listening";
  const hasThread = messages.length > 0 || isSending;

  return (
    <div className={`speaking-shell ${hasThread ? "has-thread" : ""}`} style={{ ...panel, maxWidth: 860, margin: "0 auto", padding: 16 }}>
      <div className="speaking-header">
        <div>
          <div style={{ ...mono(11.5), color: "var(--accent)" }}>{"// voice speaking practice"}</div>
          <div style={{ ...mono(12.5), color: "var(--muted)", marginTop: 6 }}>
            The AI asks follow-ups, corrects gently, and works your deck vocabulary into the conversation where it fits.
          </div>
        </div>
      </div>

      <div className="speaking-stage">
        <div className={`voice-avatar ${avatarState}`} aria-hidden="true">
          <span className="voice-avatar-glow" />
          <span className="robot-antenna">
            <span />
          </span>
          <span className="robot-head">
            <span className="robot-ear left" />
            <span className="robot-ear right" />
            <span className="robot-face">
              <span className="robot-eye left" />
              <span className="robot-eye right" />
              <span className="robot-mouth">
                <span />
                <span />
                <span />
              </span>
            </span>
          </span>
          <span className="robot-body">
            <span className="robot-arm left" />
            <span className="robot-core" />
            <span className="robot-arm right" />
          </span>
          <span className="robot-thinking">
            <span />
            <span />
            <span />
          </span>
        </div>

        <div className={`voice-wave ${isListening || isSpeaking || isSending ? "active" : ""}`} aria-hidden="true">
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.04}s` }} />
          ))}
        </div>

        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          disabled={!recognitionSupported || isSending}
          className={`floating-mic-button ${avatarState}`}
          aria-label={micLabel}
        >
          {isListening ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <div className="speaking-live" aria-live="polite">
          {interimText || status}
        </div>
      </div>

      {hasThread && (
        <div className="speaking-thread">
          {messages.map((m, i) => {
            const isAi = m.role === "ai";
            return (
              <div key={`${m.role}-${i}`} className={`speaking-message ${isAi ? "ai" : "user"}`}>
                {isAi && (
                  <span className="speaking-avatar">
                    <Logo size={20} />
                  </span>
                )}
                <div className="speaking-bubble">
                  {parseSegs(m.text).map((seg, j) =>
                    seg.hl ? (
                      <span key={j} style={{ ...mono(13.5, 600), color: "var(--accent)" }}>
                        {seg.text}
                      </span>
                    ) : (
                      <span key={j}>{seg.text}</span>
                    )
                  )}
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="speaking-message ai">
              <span className="speaking-avatar">
                <Logo size={20} />
              </span>
              <div className="speaking-bubble typing">
                <span className="typing-dot" style={{ animationDelay: "0s" }} />
                <span className="typing-dot" style={{ animationDelay: ".18s" }} />
                <span className="typing-dot" style={{ animationDelay: ".36s" }} />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}
