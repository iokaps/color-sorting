import { withKmProviders } from '@/components/with-km-providers';
import { config } from '@/config';
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
	const [buttonCooldown, setButtonCooldown] = React.useState(true);
	useDocumentTitle(title);

	// Button cooldown to prevent accidentally spamming start/stop
	React.useEffect(() => {
		setButtonCooldown(true);
		const timeout = setTimeout(() => {
			setButtonCooldown(false);
		}, 1000);

		return () => clearTimeout(timeout);
	}, [started]);

	// Handle reset game with confirmation
	const handleResetGame = async () => {
		const confirmed = confirm(
			'Are you sure you want to reset the game? All progress will be lost.'
		);
		if (confirmed) {
			setButtonCooldown(true);
			try {
				await roundActions.resetGame();
			} catch (error) {
				console.error('Failed to reset game:', error);
				setButtonCooldown(false);
			}
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
							onClick={globalActions.stopGame}
							disabled={buttonCooldown}
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
							disabled={buttonCooldown}
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
