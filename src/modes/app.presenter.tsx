import { withKmProviders } from '@/components/with-km-providers';
import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { ColorPresenterView } from '@/views/color-presenter-view';
import { ColorResultsView } from '@/views/color-results-view';
import { FinalResultsView } from '@/views/final-results-view';
import { useSnapshot } from '@kokimoki/app';
import { KmQrCode } from '@kokimoki/shared';
import * as React from 'react';

const App: React.FC = () => {
	const { title } = config;
	const { started, roundActive, roundNumber, gameComplete } = useSnapshot(
		globalStore.proxy
	);

	useGlobalController();
	useDocumentTitle(title);

	if (kmClient.clientContext.mode !== 'presenter') {
		throw new Error('App presenter rendered in non-presenter mode');
	}

	const playerLink = generateLink(kmClient.clientContext.playerCode, {
		mode: 'player'
	});

	return (
		<>
			<HostPresenterLayout.Root className="km-animated-bg-dark">
				<HostPresenterLayout.Header />

				<HostPresenterLayout.Main className="relative flex-col justify-center">
					{/* QR Code - Fixed in top right corner */}
					<div className="absolute top-8 right-8 flex flex-col items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-md">
						<KmQrCode data={playerLink} size={150} interactive={false} />
						<p className="text-center text-sm font-medium text-white/80">
							Scan to join
						</p>
					</div>

					{/* Main content - centered */}
					<div className="flex w-full flex-col items-center justify-center gap-12">
						{!started ? (
							<div className="km-fade-in-up text-center">
								<h1 className="mb-4 text-6xl font-extrabold tracking-tight text-white drop-shadow-lg">
									{title}
								</h1>
								<p className="text-2xl font-light text-slate-300/80">
									Waiting for host to start the game...
								</p>
								<div className="mt-6 flex justify-center gap-1.5">
									<span className="size-2.5 animate-bounce rounded-full bg-blue-400/60 [animation-delay:-0.3s]" />
									<span className="size-2.5 animate-bounce rounded-full bg-blue-400/60 [animation-delay:-0.15s]" />
									<span className="size-2.5 animate-bounce rounded-full bg-blue-400/60" />
								</div>
							</div>
						) : gameComplete ? (
							<FinalResultsView />
						) : roundActive ? (
							<ColorPresenterView />
						) : roundNumber > 0 ? (
							<ColorResultsView />
						) : null}
					</div>
				</HostPresenterLayout.Main>
			</HostPresenterLayout.Root>
		</>
	);
};

export default withKmProviders(App);
