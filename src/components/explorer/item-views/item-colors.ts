export const Colors = {
  red: `bg-red-100 border-red-300`,
  green: `bg-green-100 border-green-300`,
  blue: `bg-blue-100 border-blue-300`,
  yellow: `bg-yellow-100 border-yellow-300`,
  purple: `bg-purple-100 border-purple-300`,
  teal: `bg-teal-100 border-teal-300`,
  orange: `bg-orange-100 border-orange-300`,
  slate: `bg-slate-100 border-slate-300`,
} as const;

export type TColorName = keyof typeof Colors;
export type TColorValue = (typeof Colors)[TColorName];
