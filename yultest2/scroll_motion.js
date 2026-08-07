const KEYFRAMES = [
  { progress: 0, screenX: 0.5, screenY: 0.24, yaw: 0, tilt: 0, heightRatio: 0.22 },
  { progress: 0.58, screenX: 0.5, screenY: 0.5, yaw: Math.PI * 2, tilt: -17 * Math.PI / 180, heightRatio: 0.82 },
  { progress: 0.7, screenX: 0.5, screenY: 0.5, yaw: Math.PI * 2, tilt: -17 * Math.PI / 180, heightRatio: 0.82 },
  { progress: 1, screenX: 0.27, screenY: 0.64, yaw: Math.PI * 2, tilt: 0, heightRatio: 0.34 },
];

export function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(value) {
  const normalized = clamp(value);
  return normalized * normalized * (3 - 2 * normalized);
}

function interpolate(start, end, amount) {
  return start + (end - start) * amount;
}

function getStage(progress) {
  if (progress < 0.38) return 'intro';
  if (progress <= 0.7) return 'feature';
  return 'detail';
}

export function getScrollFrame(progress, isReducedMotion) {
  const normalized = clamp(progress);
  let start = KEYFRAMES[0];
  let end = KEYFRAMES[KEYFRAMES.length - 1];
  for (let index = 0; index < KEYFRAMES.length - 1; index += 1) {
    if (normalized <= KEYFRAMES[index + 1].progress) {
      start = KEYFRAMES[index];
      end = KEYFRAMES[index + 1];
      break;
    }
  }
  const range = end.progress - start.progress;
  const amount = range === 0 ? 0 : smoothstep((normalized - start.progress) / range);
  return {
    progress: normalized,
    screenX: interpolate(start.screenX, end.screenX, amount),
    screenY: interpolate(start.screenY, end.screenY, amount),
    yaw: isReducedMotion ? 0 : interpolate(start.yaw, end.yaw, amount),
    tilt: isReducedMotion ? 0 : interpolate(start.tilt, end.tilt, amount),
    heightRatio: interpolate(start.heightRatio, end.heightRatio, amount),
    stage: getStage(normalized),
    isReducedMotion,
  };
}
