const SKILL_TIMING_MULTIPLIER = 3;

export function skillCastDuration(duration: number | undefined) {
  return (duration || 0) * SKILL_TIMING_MULTIPLIER;
}

export function skillRecoveryDuration(stage: number) {
  return (.36 + Math.min(10, stage) * .012) * SKILL_TIMING_MULTIPLIER;
}
