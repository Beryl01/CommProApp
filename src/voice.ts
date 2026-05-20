let voiceOn = true;

export function isVoiceOn(): boolean { return voiceOn; }

export function setVoiceOn(val: boolean): void {
  voiceOn = val;
}

export function speak(text: string): void {
  if (!voiceOn || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices    = speechSynthesis.getVoices();
  utterance.voice =
    voices.find((v) => v.name.includes('Google UK English Male')) ??
    voices.find((v) => v.lang === 'en-GB') ??
    voices.find((v) => v.lang.startsWith('en')) ??
    voices[0] ?? null;
  utterance.rate  = 1;
  utterance.pitch = 1;
  speechSynthesis.speak(utterance);
}

export function stopSpeak(): void {
  window.speechSynthesis?.cancel();
}