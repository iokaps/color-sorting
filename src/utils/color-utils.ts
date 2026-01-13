/**
 * Utility functions for dynamic color management
 */

export type ColorName = string; // Now supports dynamic colors

const COLOR_CLASSES: Record<string, string> = {
	red: 'bg-rose-600',
	blue: 'bg-blue-700',
	green: 'bg-emerald-600',
	yellow: 'bg-amber-600',
	purple: 'bg-purple-600',
	pink: 'bg-pink-600',
	indigo: 'bg-indigo-600',
	cyan: 'bg-cyan-600',
	orange: 'bg-orange-600',
	lime: 'bg-lime-600'
};

const COLOR_HEX: Record<string, string> = {
	red: '#e11d48',
	blue: '#1e40af',
	green: '#059669',
	yellow: '#b45309',
	purple: '#a855f7',
	pink: '#ec4899',
	indigo: '#4f46e5',
	cyan: '#0891b2',
	orange: '#ea580c',
	lime: '#65a30d'
};

const ALL_COLORS = [
	'red',
	'blue',
	'green',
	'yellow',
	'purple',
	'pink',
	'indigo',
	'cyan',
	'orange',
	'lime'
] as const;

/**
 * Generate an array of color names based on the number of colors
 */
export function generateColorArray(numberOfColors: number): ColorName[] {
	const count = Math.max(1, Math.min(10, numberOfColors));
	return ALL_COLORS.slice(0, count) as ColorName[];
}

/**
 * Get the CSS class for a color
 */
export function getColorClass(color: ColorName): string {
	return COLOR_CLASSES[color] || COLOR_CLASSES['red'];
}

/**
 * Get the hex color code for a color
 */
export function getColorHex(color: ColorName): string {
	return COLOR_HEX[color] || COLOR_HEX['red'];
}
