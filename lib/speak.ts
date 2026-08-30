export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, lang = "en-US"): void {
  if (!canSpeak() || !text.trim()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.95;
  const enVoice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("en"));
  if (enVoice) u.voice = enVoice;
  synth.speak(u);
}
