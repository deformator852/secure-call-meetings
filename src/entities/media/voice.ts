export const VOICE_IDS = ["natural", "deep", "high", "chipmunk", "robot"] as const;

export type VoiceId = (typeof VOICE_IDS)[number];

export const VOICE_OPTIONS: { id: VoiceId; label: string }[] = [
  { id: "natural", label: "Natural" },
  { id: "deep", label: "Deep" },
  { id: "high", label: "High" },
];

export function isVoiceId(value: string): value is VoiceId {
  return (VOICE_IDS as readonly string[]).includes(value);
}
