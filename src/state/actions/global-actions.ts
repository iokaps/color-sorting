import { kmClient } from '@/services/km-client';
import { globalStore, type ColorName } from '../stores/global-store';

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

	async updateLogoUrl(logoUrl: string | null) {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.logoUrl = logoUrl;
		});
	}
};
