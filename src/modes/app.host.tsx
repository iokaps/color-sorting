import { withKmProviders } from '@/components/with-km-providers';
import { config } from '@/config';
import { useButtonCooldown } from '@/hooks/useButtonCooldown';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { globalActions } from '@/state/actions/global-actions';
import { roundActions } from '@/state/actions/round-actions';
import { globalStore } from '@/state/stores/global-store';
import { ColorNamingView } from '@/views/color-naming-view';
import { ColorRoundControlView } from '@/views/color-round-control-view';
import { FinalResultsView } from '@/views/final-results-view';
import { useSnapshot } from '@kokimoki/app';
import { CircleStop, RotateCcw, SquareArrowOutUpRight } from 'lucide-react';
import * as React from 'react';

const App: React.FC = () => {
	useGlobalController();
	const { title } = config;
	const isHost = kmClient.clientContext.mode === 'host';
	const { started, gameComplete } = useSnapshot(globalStore.proxy);
	const [isCoolingDown, startCooldown] = useButtonCooldown(1000);
	useDocumentTitle(title);

	// Handle reset game with confirmation
	const handleResetGame = async () => {
		const confirmed = confirm(
			'Are you sure you want to reset the game? All progress will be lost.'
		);
		if (confirmed) {
			startCooldown();
			try {
				await roundActions.resetGame();
			} catch (error) {
				console.error('Failed to reset game:', error);
			}
		}
	};

	// Handle stop game with cooldown
	const handleStopGame = async () => {
		startCooldown();
		try {
			await globalActions.stopGame();
		} catch (error) {
			console.error('Failed to stop game:', error);
		}
	};

	if (kmClient.clientContext.mode !== 'host') {
		throw new Error('App host rendered in non-host mode');
	}

	const presenterLink = generateLink(kmClient.clientContext.presenterCode, {
		mode: 'presenter',
		playerCode: kmClient.clientContext.playerCode
	});

	return (
		<HostPresenterLayout.Root>
			<HostPresenterLayout.Header />
			<HostPresenterLayout.Main>
				{!started ? (
					<ColorNamingView />
				) : gameComplete ? (
					<FinalResultsView />
				) : (
					<ColorRoundControlView />
				)}
			</HostPresenterLayout.Main>

			<HostPresenterLayout.Footer>
				<div className="inline-flex flex-wrap gap-4">
					{started && isHost && (
						<button
							type="button"
							className="km-btn-error"
							onClick={handleStopGame}
							disabled={isCoolingDown}
						>
							<CircleStop className="size-5" />
							{config.stopButton}
						</button>
					)}
					{isHost && (gameComplete || !started) && (
						<button
							type="button"
							className="km-btn-neutral"
							onClick={handleResetGame}
							disabled={isCoolingDown}
						>
							<RotateCcw className="size-5" />
							{config.resetGameButton}
						</button>
					)}
					<a
						href={presenterLink}
						target="_blank"
						rel="noreferrer"
						className="km-btn-secondary"
					>
						{config.presenterLinkLabel}
						<SquareArrowOutUpRight className="size-5" />
					</a>
				</div>
			</HostPresenterLayout.Footer>
		</HostPresenterLayout.Root>
	);
};

export default withKmProviders(App);
