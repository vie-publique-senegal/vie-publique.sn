/**
 * Génère et injecte un thème de couleur primaire pour le dashboard électoral.
 * Appelé automatiquement par useElectoralDashboard() sur chaque page élections.
 *
 * Configuration dans app.config.ts :
 *   vpsnElections.theme.primaryColor: '#2563EB'
 *
 * Le composable génère les 11 palettes de nuances (50→950) à partir d'une seule
 * couleur hex, puis les injecte comme variables CSS qui surchargent --color-primary-*
 * de Nuxt UI.
 */

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!result) return null;
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100;

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  if (s === 0) {
    const val = Math.round(l * 255);
    return [val, val, val];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

/**
 * Génère les 11 nuances (50 → 950) d'une couleur en partant d'un hex.
 * La couleur fournie est considérée comme le shade 600.
 * Les lightness sont calées sur les valeurs des palettes Tailwind.
 */
function generatePalette(hex: string): Record<number, string> | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const [h, s] = rgbToHsl(...rgb);
  // Lightness pour chaque niveau (aligné sur la distribution Tailwind)
  const shadeMap: Record<number, number> = {
    50: 97,
    100: 93,
    200: 86,
    300: 76,
    400: 64,
    500: 53,
    600: 43,
    700: 34,
    800: 25,
    900: 18,
    950: 12,
  };

  const palette: Record<number, string> = {};
  for (const [shade, lightness] of Object.entries(shadeMap)) {
    const [r, g, b] = hslToRgb(h, Math.min(s, 88), lightness);
    palette[Number(shade)] = `${r} ${g} ${b}`;
  }

  return palette;
}

export const useElectoralTheme = () => {
  const appConfig = useAppConfig();
  const primaryColor = appConfig.vpsnElections?.theme?.primaryColor as string | undefined;

  if (!primaryColor) return;

  const palette = generatePalette(primaryColor);
  if (!palette) return;

  const cssVars = Object.entries(palette)
    .map(([shade, rgb]) => `--color-primary-${shade}: ${rgb};`)
    .join(' ');

  useHead({
    style: [
      {
        id: 'vpsn-electoral-theme',
        innerHTML: `:root { ${cssVars} }`,
      },
    ],
  });
};
