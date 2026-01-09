import { kmClient } from '@/services/km-client';

export interface PlayerState {
	name: string;
	currentView:
		| 'lobby'
		| 'shared-state'
		| 'connections'
		| 'assignment'
		| 'sorting'
		| 'results';
}

const initialState: PlayerState = {
	name: '',
	currentView: 'lobby'
};

export const playerStore = kmClient.localStore<PlayerState>(
	'player',
	initialState
);
