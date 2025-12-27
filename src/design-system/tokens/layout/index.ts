/**
 * Layout Tokens Index
 *
 * Re-exports all layout-related tokens.
 * These tokens define spacing, sizing, and visual depth.
 */

import {
  spacing as spacingImport,
  spacingSemantics as spacingSemanticsImport,
  componentSpacing as componentSpacingImport,
} from './spacing';

import {
  radius as radiusImport,
  radiusSemantics as radiusSemanticsImport,
} from './radius';

import {
  shadows as shadowsImport,
  shadowsDark as shadowsDarkImport,
  zIndex as zIndexImport,
} from './elevation';

export {
  spacing,
  spacingSemantics,
  componentSpacing,
  type SpacingToken,
  type SpacingSemanticToken,
  type Spacing,
} from './spacing';

export {
  radius,
  radiusSemantics,
  type RadiusToken,
  type RadiusSemanticToken,
  type Radius,
} from './radius';

export {
  shadows,
  shadowsDark,
  zIndex,
  elevation,
  type ShadowToken,
  type ZIndexToken,
  type Shadows,
  type ZIndex,
  type Elevation,
} from './elevation';

/**
 * Combined layout tokens object for convenience
 */
export const layout = {
  spacing: spacingImport,
  spacingSemantics: spacingSemanticsImport,
  componentSpacing: componentSpacingImport,
  radius: radiusImport,
  radiusSemantics: radiusSemanticsImport,
  shadows: shadowsImport,
  shadowsDark: shadowsDarkImport,
  zIndex: zIndexImport,
} as const;

export type Layout = typeof layout;
