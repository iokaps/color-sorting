import type { ColorName } from './global-store';

export interface ColorFactionState {
	connections: Record<string, { joinedAt: number }>;
}

export function createColorFactionState(): ColorFactionState {
	return {
		connections: {}
	};
}

export function getColorStoreName(color: ColorName): string {
	return `color-${color}-faction`;
}
