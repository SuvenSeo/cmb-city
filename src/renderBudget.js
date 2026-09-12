const MAX_PIXELS = 3_500_000;
const PHONE_PIXELS = 1_500_000;

// A pixel-ratio cap alone still allocates enormous buffers on virtual displays.
// Bound the actual drawing surface, including ultrawide and Retina screens.
export function renderScale(width, height, deviceScale = 1) {
  if (width <= 0 || height <= 0) return 1;
  const phone = width < 700;
  return Math.min(deviceScale, phone ? 2 : 2,
    Math.sqrt((phone ? PHONE_PIXELS : MAX_PIXELS) / (width * height)),
    3200 / Math.max(width, height));
}

export const FRAME_INTERVAL = 1000 / 30;
