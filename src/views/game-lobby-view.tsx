import { config } from '@/config';
import { Users } from 'lucide-react';
import React from 'react';
import Markdown from 'react-markdown';

/**
 * View to display the game lobby information before the game starts
 *
 * This example is **optional** and can be removed if not needed
 */
export const GameLobbyView: React.FC<React.PropsWithChildren> = () => {
	return (
		<div className="flex flex-col items-center gap-8 px-4">
			{/* Animated waiting indicator */}
			<div className="relative flex items-center justify-center">
				<div className="absolute size-20 animate-ping rounded-full bg-blue-400/20 [animation-duration:2s]" />
				<div className="km-soft-pulse absolute size-16 rounded-full bg-blue-400/30" />
				<div className="relative flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
					<Users className="size-6 text-white" />
				</div>
			</div>

			<article className="prose prose-sm sm:prose w-full max-w-xl text-center">
				<Markdown>{config.gameLobbyMd}</Markdown>
			</article>
		</div>
	);
};
