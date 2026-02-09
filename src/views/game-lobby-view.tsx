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
			<div className="km-scale-in relative flex items-center justify-center">
				<div className="absolute size-24 animate-ping rounded-full bg-blue-400/10 [animation-duration:3s]" />
				<div className="km-soft-pulse absolute size-20 rounded-full bg-blue-400/20" />
				<div className="absolute size-16 rounded-full bg-blue-400/10 blur-md" />
				<div className="km-float relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
					<Users className="size-7 text-white" />
				</div>
			</div>

			<article className="prose prose-sm sm:prose km-fade-in-up-delay-1 w-full max-w-xl text-center">
				<Markdown>{config.gameLobbyMd}</Markdown>
			</article>
		</div>
	);
};
