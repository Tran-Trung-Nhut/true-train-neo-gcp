"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Sparkles, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { WRITING_TASK1_MIN_WORDS } from "@/lib/ai/writing-types";
import { ghostBtn, grotesk, mono, panel, solidBtn } from "../shared/ui";
import { fileToDataUrl, MAX_IMAGE_BYTES } from "./image-utils";
import WritingResult from "./WritingResult";

function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

export default function Writing() {
  const nav = useStore((s) => s.nav);
  const image = useStore((s) => s.writingImage);
  const answer = useStore((s) => s.writingAnswer);
  const grading = useStore((s) => s.writingGrading);
  const error = useStore((s) => s.writingError);
  const result = useStore((s) => s.writingResult);
  const available = useStore((s) => s.writingAvailable);
  const limit = useStore((s) => s.writingLimit);
  const remaining = useStore((s) => s.writingRemaining);
  const setImage = useStore((s) => s.setWritingImage);
  const setAnswer = useStore((s) => s.setWritingAnswer);
  const grade = useStore((s) => s.gradeWriting);
  const loadQuota = useStore((s) => s.loadWritingQuota);

  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    void loadQuota();
  }, [loadQuota]);

  const words = countWords(answer);
  const enoughWords = words >= WRITING_TASK1_MIN_WORDS;
  const noQuota = remaining === 0;
  const canGrade = !!image && words >= 20 && !grading && !noQuota && available;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("Image is too large (8MB maximum).");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setImage(dataUrl);
    } catch {
      setUploadError("Could not read that image. Try a different one.");
    }
  }

  return (
    <div className="app-container" style={{ padding: "26px 24px 64px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => nav("ielts")} className="ghost-btn" style={{ ...ghostBtn, padding: "8px 11px" }}>
            <ArrowLeft size={15} /> IELTS
          </button>
          <div>
            <h1 style={{ ...grotesk(23), margin: 0 }}>Writing — Academic Task 1</h1>
            <div style={{ ...mono(11.5), color: "var(--muted)", marginTop: 3 }}>
              Upload the task image, write your answer, and AI grades it against the IELTS criteria.
            </div>
          </div>
        </div>
        <span
          style={{
            ...mono(11.5, 600),
            color: noQuota ? "var(--bad)" : "var(--accent)",
            padding: "6px 11px",
            borderRadius: 999,
            border: `1px solid ${noQuota ? "color-mix(in srgb, var(--bad) 40%, var(--border))" : "color-mix(in srgb, var(--accent) 34%, var(--border))"}`,
            background: "var(--panel)",
          }}
        >
          {typeof remaining === "number" && typeof limit === "number"
            ? `${remaining}/${limit} gradings left today`
            : "Up to 3 gradings per day"}
        </span>
      </div>

      {!available && (
        <div style={{ ...panel, marginTop: 16, padding: "12px 14px", borderColor: "color-mix(in srgb, var(--warning) 45%, var(--border))", color: "var(--warning)", ...mono(12.5, 600) }}>
          AI grading is not enabled on the server (missing model configuration). You can still explore the interface.
        </div>
      )}

      <div className="writing-cols" style={{ marginTop: 20 }}>
        <div style={{ ...panel, padding: 16 }}>
          <div style={{ ...mono(11, 600), color: "var(--faint)", textTransform: "uppercase", marginBottom: 10 }}>
            task prompt (image)
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          {image ? (
            <div style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt="task prompt"
                style={{ width: "100%", borderRadius: 10, border: "1px solid var(--border)", display: "block" }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => fileRef.current?.click()} className="ghost-btn" style={ghostBtn}>
                  change image
                </button>
                <button onClick={() => setImage("")} className="ghost-btn" style={{ ...ghostBtn, color: "var(--bad)" }}>
                  <X size={14} /> remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void handleFile(e.dataTransfer.files?.[0]);
              }}
              style={{
                width: "100%",
                minHeight: 240,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                borderRadius: 12,
                border: `1.5px dashed ${dragOver ? "var(--accent)" : "var(--borderHi)"}`,
                background: dragOver ? "color-mix(in srgb, var(--accent) 8%, var(--panelHi))" : "var(--panelHi)",
                color: "var(--muted)",
                cursor: "pointer",
                transition: "border-color .15s, background .15s",
              }}
            >
              <ImagePlus size={30} style={{ color: "var(--accent)" }} />
              <div style={{ ...grotesk(15), color: "var(--text)" }}>Drag and drop, or click to upload the task image</div>
              <div style={{ ...mono(11.5), color: "var(--faint)" }}>PNG, JPG - 8MB maximum</div>
            </button>
          )}
          {uploadError && (
            <div style={{ ...mono(11.5, 600), color: "var(--bad)", marginTop: 10 }}>{uploadError}</div>
          )}
        </div>

        <div style={{ ...panel, padding: 16, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ ...mono(11, 600), color: "var(--faint)", textTransform: "uppercase" }}>
              your answer
            </div>
            <div style={{ ...mono(11.5, 600), color: enoughWords ? "var(--ok)" : "var(--muted)" }}>
              {words} words {enoughWords ? "✓" : `/ ${WRITING_TASK1_MIN_WORDS}`}
            </div>
          </div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Write your answer here..."
            style={{
              flex: 1,
              minHeight: 240,
              resize: "vertical",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--panelHi)",
              color: "var(--text)",
              fontSize: 14.5,
              lineHeight: 1.6,
              fontFamily: "inherit",
            }}
          />
          {!enoughWords && words > 0 && (
            <div style={{ ...mono(11), color: "var(--warning)", marginTop: 8 }}>
              Task 1 requires at least {WRITING_TASK1_MIN_WORDS} words. Write enough to avoid a penalty.
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{ ...panel, marginTop: 16, padding: "11px 13px", borderColor: "color-mix(in srgb, var(--bad) 45%, var(--border))", color: "var(--bad)", ...mono(12.5, 600) }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button
          onClick={() => void grade()}
          disabled={!canGrade}
          className="solid-btn"
          style={{ ...solidBtn, padding: "11px 18px", opacity: canGrade ? 1 : 0.55, cursor: canGrade ? "pointer" : "default" }}
        >
          {grading ? <span className="spinner" /> : <Sparkles size={15} />}
          {grading ? "grading..." : "grade with AI"}
        </button>
      </div>

      {grading && (
        <div style={{ ...panel, marginTop: 18, padding: 20 }}>
          <div style={{ ...mono(12.5), color: "var(--muted)", marginBottom: 14 }}>
            {"> AI is reading the task and grading your answer..."}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="skeleton" style={{ height: 60 }} />
            <div className="skeleton" style={{ height: 90 }} />
            <div className="skeleton" style={{ height: 90 }} />
          </div>
        </div>
      )}

      {!grading && result && <WritingResult />}
    </div>
  );
}
