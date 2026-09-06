const MAX_PIXELS = 2_000_000;
const PHONE_PIXELS = 900_000;

// A pixel-ratio cap alone still allocates enormous buffers on virtual displays.
// Bound the actual drawing surface, including ultrawide and Retina screens.
export function renderScale(width, height, deviceScale = 1) {
  if (width <= 0 || height <= 0) return 1;
  const phone = width < 700;
  return Math.min(deviceScale, phone ? 1.5 : 1.25,
    Math.sqrt((phone ? PHONE_PIXELS : MAX_PIXELS) / (width * height)),
    2560 / Math.max(width, height));
}

export const FRAME_INTERVAL = 1000 / 30;
