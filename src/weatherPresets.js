export const WEATHER_PRESETS = {
  clear: {label:'Clear skies', description:'Sun & scattered clouds', clouds:.28, rain:0, wind:.3, wetness:0, sun:1, ambient:1, fog:'#cbd8db', fogScale:1, darkness:0},
  cloudy: {label:'Cloudy', description:'A soft, overcast sky', clouds:.82, rain:0, wind:.4, wetness:0, sun:.38, ambient:1.12, fog:'#b7c7cf', fogScale:.8, darkness:.25},
  rain: {label:'Rain', description:'Gentle showers & lake ripples', clouds:.88, rain:.3, wind:.55, wetness:.55, sun:.24, ambient:1.04, fog:'#9eafb9', fogScale:.64, darkness:.4},
  heavy: {label:'Heavy rain', description:'Low visibility & wind-driven rain', clouds:.96, rain:.75, wind:.95, wetness:.9, sun:.14, ambient:.95, fog:'#7e94a2', fogScale:.42, darkness:.65},
  storm: {label:'Thunderstorm', description:'Dark clouds & distant lightning', clouds:1, rain:1, wind:1.3, wetness:1, sun:.09, ambient:.86, fog:'#667f8f', fogScale:.34, darkness:.85},
};

// One gently fading event, separated by long quiet intervals. No strobe or
// repeated flashes; reduced-motion mode disables the event entirely.
export function lightningPulse(time, enabled = true) {
  if (!enabled) return 0;
  const phase = ((time % 17) + 17) % 17;
  if (phase < 6 || phase > 6.7) return 0;
  return Math.sin((phase - 6) / .7 * Math.PI) ** 2;
}
