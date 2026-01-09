import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { ConnectionsView } from '@/views/connections-view';
import { useSnapshot } from '@kokimoki/app';
import { KmQrCode } from '@kokimoki/shared';
import * as React from 'react';

const App: React.FC = () => {
	const { title } = config;
	const { showPresenterQr } = useSnapshot(globalStore.proxy);

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
					<ConnectionsView>
						<KmQrCode
							data={playerLink}
							size={200}
							className={cn(!showPresenterQr && 'invisible')}
						/>
					</ConnectionsView>
				</HostPresenterLayout.Main>
			</HostPresenterLayout.Root>
		</>
	);
};

export default App;
