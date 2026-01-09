import { kmClient } from '@/services/km-client';

export type ColorName = 'red' | 'blue' | 'green' | 'yellow';

export interface GlobalState {
	controllerConnectionId: string;
	started: boolean;
	startTimestamp: number;
	players: Record<string, { name: string }>;
	showPresenterQr: boolean;
	playerColors: Record<string, ColorName>; // clientId -> assigned color
	colorNames: Record<ColorName, string>; // color -> custom name (e.g., red -> "Marketing")
	roundNumber: number;
	roundStartTimestamp: number;
	roundActive: boolean;
	roundResults: Record<ColorName, number>; // color -> largest faction size
	roundDurationSeconds: number; // customizable round duration
	logoUrl: string | null; // optional logo URL
}

const initialState: GlobalState = {
	controllerConnectionId: '',
	started: false,
	startTimestamp: 0,
	players: {},
	showPresenterQr: true,
	playerColors: {},
	colorNames: { red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow' },
	roundNumber: 0,
	roundStartTimestamp: 0,
	roundActive: false,
	roundResults: { red: 0, blue: 0, green: 0, yellow: 0 },
	roundDurationSeconds: 90,
	logoUrl: null
};

export const globalStore = kmClient.store<GlobalState>('global', initialState);
