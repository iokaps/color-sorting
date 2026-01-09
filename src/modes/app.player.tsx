import { PlayerMenu } from '@/components/menu';
import { NameLabel } from '@/components/name-label';
import { withKmProviders } from '@/components/with-km-providers';
import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { PlayerLayout } from '@/layouts/player';
import { kmClient } from '@/services/km-client';
import { playerActions } from '@/state/actions/player-actions';
import { globalStore } from '@/state/stores/global-store';
import { playerStore } from '@/state/stores/player-store';
import { ColorAssignmentView } from '@/views/color-assignment-view';
import { ColorResultsView } from '@/views/color-results-view';
import { ColorSortingView } from '@/views/color-sorting-view';
import { ConnectionsView } from '@/views/connections-view';
import { CreateProfileView } from '@/views/create-profile-view';
import { FinalResultsView } from '@/views/final-results-view';
import { GameLobbyView } from '@/views/game-lobby-view';
import { useSnapshot } from '@kokimoki/app';
import * as React from 'react';

const App: React.FC = () => {
	const { title } = config;
	const { name, currentView } = useSnapshot(playerStore.proxy);
	const { started, playerColors, roundActive, roundNumber, gameComplete } =
		useSnapshot(globalStore.proxy);

	useGlobalController();
	useDocumentTitle(title);

	const playerColor = playerColors[kmClient.id];
	const hasColorAssignment = Boolean(playerColor);

	React.useEffect(() => {
		// Update view based on game state
		if (!started) {
			playerActions.setCurrentView('lobby');
		} else if (!hasColorAssignment) {
			playerActions.setCurrentView('assignment');
		} else if (roundActive) {
			playerActions.setCurrentView('sorting');
		} else if (roundNumber > 0) {
			playerActions.setCurrentView('results');
		}
	}, [started, hasColorAssignment, roundActive, roundNumber]);

	if (!name) {
		return (
			<PlayerLayout.Root>
				<PlayerLayout.Header />
				<PlayerLayout.Main>
					<CreateProfileView />
				</PlayerLayout.Main>
			</PlayerLayout.Root>
		);
	}

	if (!started) {
		return (
			<PlayerLayout.Root>
				<PlayerLayout.Header>
					<PlayerMenu />
				</PlayerLayout.Header>

				<PlayerLayout.Main>
					{currentView === 'lobby' && <GameLobbyView />}
					{currentView === 'connections' && <ConnectionsView />}
				</PlayerLayout.Main>

				<PlayerLayout.Footer>
					<NameLabel name={name} />
				</PlayerLayout.Footer>
			</PlayerLayout.Root>
		);
	}

	// Game has started - show color-based views
	return (
		<PlayerLayout.Root>
			<PlayerLayout.Header />

			<PlayerLayout.Main>
				{gameComplete ? (
					<FinalResultsView />
				) : !hasColorAssignment ? (
					<ColorAssignmentView />
				) : roundActive ? (
					<ColorSortingView />
				) : roundNumber > 0 ? (
					<ColorResultsView />
				) : null}
			</PlayerLayout.Main>

			<PlayerLayout.Footer>
				<NameLabel name={name} />
			</PlayerLayout.Footer>
		</PlayerLayout.Root>
	);
};

export default withKmProviders(App);
