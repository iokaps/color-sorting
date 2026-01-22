import { kmClient } from '@/services/km-client';
import {
	globalStore,
	type ColorName,
	type PresenterVisualizationMode
} from '../stores/global-store';

export const globalActions = {
	async startGame() {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.started = true;
			globalState.startTimestamp = kmClient.serverTimestamp();
		});
	},

	async stopGame() {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.started = false;
			globalState.startTimestamp = 0;
			globalState.roundActive = false;
			globalState.roundStartTimestamp = 0;
		});
	},

	async togglePresenterQr() {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.showPresenterQr = !globalState.showPresenterQr;
		});
	},

	async updateColorName(color: ColorName, name: string) {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.colorNames[color] = name;
		});
	},

	async updateRoundDuration(durationSeconds: number) {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.roundDurationSeconds = durationSeconds;
		});
	},

	async updateTotalRounds(totalRounds: number) {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.totalRounds = Math.max(1, totalRounds);
		});
	},

	async updateLogoUrl(logoUrl: string | null) {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.logoUrl = logoUrl;
		});
	},

	async updateNumberOfColors(numberOfColors: number) {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.numberOfColors = Math.max(1, Math.min(10, numberOfColors));
		});
	},

	async updateWinBonus(bonusPoints: number) {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.winBonus = Math.max(1, bonusPoints);
		});
	},

	async setPresenterVisualizationMode(mode: PresenterVisualizationMode) {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.presenterVisualizationMode = mode;
		});
	}
};
