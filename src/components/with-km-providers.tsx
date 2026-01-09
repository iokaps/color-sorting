import {
	KmAudioProvider,
	KmConfettiProvider,
	KmModalProvider
} from '@kokimoki/shared';
import type { ComponentType } from 'react';

/**
 * HOC that wraps a component with all Kokimoki shared providers.
 * Providers included: KmAudioProvider, KmConfettiProvider, KmModalProvider
 *
 * This example is **optional** and can be removed if not needed
 *
 * @example
 * export default withKmProviders(App);
 */
export function withKmProviders<P extends object>(Component: ComponentType<P>) {
	return function WithKmProviders(props: P) {
		return (
			<KmAudioProvider>
				<KmConfettiProvider>
					<KmModalProvider>
						<Component {...props} />
					</KmModalProvider>
				</KmConfettiProvider>
			</KmAudioProvider>
		);
	};
}
