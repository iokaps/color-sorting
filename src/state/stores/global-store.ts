import { kmClient } from '@/services/km-client';
import { generateColorArray } from '@/utils/color-utils';

export type ColorName = string;

export interface RoundResult {
	winningColors: ColorName[]; // array to support ties
	winningColorNames: string[];
	largestFactionSize: number;
	bonusPointsPerPlayer: number; // points awarded to players in winning faction(s)
}

export interface PlayerRoundScore {
	roundNumber: number;
	color: ColorName;
	colorName: string;
	factionSize: number; // size of their connected component
	connectionPoints: number; // 1 per edge
	bonusPoints: number; // if in winning faction
	totalRoundPoints: number;
}

export interface PlayerScore {
	name: string;
	totalScore: number;
	roundScores: Record<string, PlayerRoundScore>; // roundNumber as string -> score data
}

export interface GlobalState {
	controllerConnectionId: string;
	started: boolean;
	startTimestamp: number;
	players: Record<string, { name: string }>;
	showPresenterQr: boolean;
	playerColors: Record<string, ColorName>; // clientId -> assigned color
	colorNames: Record<ColorName, string>; // color -> custom name (e.g., red -> "Marketing")
	roundNumber: number;
	totalRounds: number; // total rounds to play
	roundStartTimestamp: number;
	roundActive: boolean;
	roundResults: Record<ColorName, number>; // color -> largest faction size
	roundHistory: Record<string, RoundResult>; // roundNumber as string -> result
	roundDurationSeconds: number; // customizable round duration
	numberOfColors: number; // 1-10 colors available for sorting
	logoUrl: string | null; // optional logo URL
	gameComplete: boolean; // true when all rounds are done
	playerScores: Record<string, PlayerScore>; // clientId -> player score data
	winBonus: number; // bonus points for winning faction
}

function createInitialColorNames(
	numberOfColors: number
): Record<ColorName, string> {
	const colors = generateColorArray(numberOfColors);
	const names: Record<ColorName, string> = {};
	const defaultNames: Record<string, string> = {
		red: 'Red',
		blue: 'Blue',
		green: 'Green',
		yellow: 'Yellow',
		purple: 'Purple',
		pink: 'Pink',
		indigo: 'Indigo',
		cyan: 'Cyan',
		orange: 'Orange',
		lime: 'Lime'
	};
	colors.forEach((color) => {
		names[color] = defaultNames[color] || color;
	});
	return names;
}

function createInitialRoundResults(
	numberOfColors: number
): Record<ColorName, number> {
	const colors = generateColorArray(numberOfColors);
	const results: Record<ColorName, number> = {};
	colors.forEach((color) => {
		results[color] = 0;
	});
	return results;
}

const initialState: GlobalState = {
	controllerConnectionId: '',
	started: false,
	startTimestamp: 0,
	players: {},
	showPresenterQr: true,
	playerColors: {},
	colorNames: createInitialColorNames(4),
	roundNumber: 0,
	totalRounds: 3,
	roundStartTimestamp: 0,
	roundActive: false,
	roundResults: createInitialRoundResults(4),
	roundHistory: {},
	roundDurationSeconds: 90,
	numberOfColors: 4,
	logoUrl: null,
	gameComplete: false,
	playerScores: {},
	winBonus: 10
};

export const globalStore = kmClient.store<GlobalState>('global', initialState);
