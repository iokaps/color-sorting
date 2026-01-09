import { withKmProviders } from '@/components/with-km-providers';
import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { ColorPresenterView } from '@/views/color-presenter-view';
import { ColorResultsView } from '@/views/color-results-view';
import { ConnectionsView } from '@/views/connections-view';
import { useSnapshot } from '@kokimoki/app';
import { KmQrCode } from '@kokimoki/shared';
import * as React from 'react';

const App: React.FC = () => {
	const { title } = config;
	const { showPresenterQr, started, roundActive, roundNumber } = useSnapshot(
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
			<HostPresenterLayout.Root>
				<HostPresenterLayout.Header />

				<HostPresenterLayout.Main>
					{!started ? (
						<ConnectionsView>
							<KmQrCode
								data={playerLink}
								size={200}
								className={cn(!showPresenterQr && 'invisible')}
							/>
						</ConnectionsView>
					) : roundActive ? (
						<ColorPresenterView />
					) : roundNumber > 0 ? (
						<ColorResultsView />
					) : null}
				</HostPresenterLayout.Main>
			</HostPresenterLayout.Root>
		</>
	);
};

export default withKmProviders(App);
