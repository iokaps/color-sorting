import { config } from '@/config';
import React from 'react';
import Markdown from 'react-markdown';

/**
 * View to display the game lobby information before the game starts
 *
 * This example is **optional** and can be removed if not needed
 */
export const GameLobbyView: React.FC<React.PropsWithChildren> = () => {
	return (
		<article className="prose">
			<Markdown>{config.gameLobbyMd}</Markdown>
		</article>
	);
};
