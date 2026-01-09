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
		<article className="prose prose-sm sm:prose w-full max-w-xl px-4 text-center">
			<Markdown>{config.gameLobbyMd}</Markdown>
		</article>
	);
};
