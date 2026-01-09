import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { globalActions } from '@/state/actions/global-actions';
import { globalStore } from '@/state/stores/global-store';
import { ColorNamingView } from '@/views/color-naming-view';
import { ColorRoundControlView } from '@/views/color-round-control-view';
import { SharedStateView } from '@/views/shared-state-view';
import { useSnapshot } from '@kokimoki/app';
import { CirclePlay, CircleStop, SquareArrowOutUpRight } from 'lucide-react';
import * as React from 'react';

const App: React.FC = () => {
	useGlobalController();
	const { title } = config;
	const isHost = kmClient.clientContext.mode === 'host';
	const { started, showPresenterQr } = useSnapshot(globalStore.proxy);
	const [showColorNaming, setShowColorNaming] = React.useState(false);
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

	// Close color naming view when game starts
	React.useEffect(() => {
		if (started) {
			setShowColorNaming(false);
		}
	}, [started]);

	if (kmClient.clientContext.mode !== 'host') {
		throw new Error('App host rendered in non-host mode');
	}

	const playerLink = generateLink(kmClient.clientContext.playerCode, {
		mode: 'player'
	});

	const presenterLink = generateLink(kmClient.clientContext.presenterCode, {
		mode: 'presenter',
		playerCode: kmClient.clientContext.playerCode
	});

	return (
		<HostPresenterLayout.Root>
			<HostPresenterLayout.Header />
			<HostPresenterLayout.Main>
				{showColorNaming ? (
					<ColorNamingView />
				) : !started ? (
					<div className="space-y-4">
						<SharedStateView />

						<button
							type="button"
							className={
								showPresenterQr ? 'km-btn-neutral' : 'km-btn-secondary'
							}
							onClick={globalActions.togglePresenterQr}
						>
							{config.togglePresenterQrButton}
						</button>
					</div>
				) : (
					<ColorRoundControlView />
				)}
			</HostPresenterLayout.Main>

			<HostPresenterLayout.Footer>
				<div className="inline-flex flex-wrap gap-4">
					{!started && !showColorNaming && isHost && (
						<button
							type="button"
							className="km-btn-primary"
							onClick={() => setShowColorNaming(true)}
							disabled={buttonCooldown}
						>
							<CirclePlay className="size-5" />
							{config.editColorNamesButton}
						</button>
					)}
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

					<a
						href={playerLink}
						target="_blank"
						rel="noreferrer"
						className="km-btn-secondary"
					>
						{config.playerLinkLabel}
						<SquareArrowOutUpRight className="size-5" />
					</a>

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

export default App;
