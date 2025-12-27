/**
 * Semantic Tokens Index
 *
 * Re-exports all semantic color tokens.
 * These are the primary tokens that components should use.
 */

export {
  surfaces,
  surfacesLight,
  surfacesDark,
  type SurfaceToken,
  type Surfaces,
} from './surfaces';

export {
  text,
  textLight,
  textDark,
  type TextToken,
  type Text,
} from './text';

export {
  borders,
  bordersLight,
  bordersDark,
  type BorderToken,
  type Borders,
} from './borders';

export {
  interactive,
  interactiveLight,
  interactiveDark,
  type InteractiveToken,
  type Interactive,
} from './interactive';

export {
  statusColors,
  successLight,
  successDark,
  warningLight,
  warningDark,
  dangerLight,
  dangerDark,
  infoLight,
  infoDark,
  type StatusColorBundle,
  type StatusVariant,
  type StatusColors,
} from './colors';

/**
 * Combined semantic tokens object for convenience
 */
export const semantic = {
  surfaces: {
    light: {} as typeof import('./surfaces').surfacesLight,
    dark: {} as typeof import('./surfaces').surfacesDark,
  },
  text: {
    light: {} as typeof import('./text').textLight,
    dark: {} as typeof import('./text').textDark,
  },
  borders: {
    light: {} as typeof import('./borders').bordersLight,
    dark: {} as typeof import('./borders').bordersDark,
  },
  interactive: {
    light: {} as typeof import('./interactive').interactiveLight,
    dark: {} as typeof import('./interactive').interactiveDark,
  },
  statusColors: {
    light: {} as typeof import('./colors').statusColors.light,
    dark: {} as typeof import('./colors').statusColors.dark,
  },
} as const;

// Re-assign with actual values (workaround for circular reference typing)
import { surfacesLight, surfacesDark } from './surfaces';
import { textLight, textDark } from './text';
import { bordersLight, bordersDark } from './borders';
import { interactiveLight, interactiveDark } from './interactive';
import { statusColors as statusColorsImport } from './colors';

(semantic.surfaces as any).light = surfacesLight;
(semantic.surfaces as any).dark = surfacesDark;
(semantic.text as any).light = textLight;
(semantic.text as any).dark = textDark;
(semantic.borders as any).light = bordersLight;
(semantic.borders as any).dark = bordersDark;
(semantic.interactive as any).light = interactiveLight;
(semantic.interactive as any).dark = interactiveDark;
(semantic.statusColors as any).light = statusColorsImport.light;
(semantic.statusColors as any).dark = statusColorsImport.dark;
