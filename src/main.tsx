// IMPORTANT: Do NOT modify this file
import React from 'react';
import ReactDOM from 'react-dom/client';
import { config } from './config';
import { launchApp } from './kit/app-launcher.tsx';
import { ErrorBoundary } from './kit/error-boundary.tsx';

const appImports = {
	host: () => import('./modes/app.host.tsx'),
	presenter: () => import('./modes/app.presenter.tsx'),
	player: () => import('./modes/app.player.tsx'),
	dev: () => import('./kit/dev.tsx')
};

function renderComponent(component: React.ReactNode) {
	ReactDOM.createRoot(document.getElementById('root')!).render(
		<React.StrictMode>
			<ErrorBoundary
				fallback={
					<div className="flex h-screen items-center justify-center px-4 font-semibold text-red-800">
						App failed to load. Please check console errors.
					</div>
				}
			>
				{component}
			</ErrorBoundary>
		</React.StrictMode>
	);
}

launchApp(config, appImports, renderComponent);
