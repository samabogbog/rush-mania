const SKILL_TIMING_MULTIPLIER = 3;

export function skillCastDuration(duration: number | undefined, level?: number) {
  const cast = (duration || 0) * SKILL_TIMING_MULTIPLIER;
  // Reserve time for authoritative tick/snapshot delivery; instant skills stay instant.
  return level === 90 || level === 100 ? Math.min(cast, .05) : cast;
}

export function skillRecoveryDuration(stage: number) {
  return (.36 + Math.min(10, stage) * .012) * SKILL_TIMING_MULTIPLIER;
}
