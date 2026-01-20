import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { getColorClass } from '@/utils/color-utils';
import { useSnapshot } from '@kokimoki/app';
import * as React from 'react';
import Markdown from 'react-markdown';

export const ColorAssignmentView: React.FC = () => {
	const { playerColors, colorNames } = useSnapshot(globalStore.proxy);

	// Get current player's color
	const playerColor = playerColors[kmClient.id];

	if (!playerColor) {
		return (
			<div className="flex h-full flex-col items-center justify-center space-y-4">
				<div className="km-spinner size-8 border-slate-400" />
				<p className="text-lg font-semibold text-slate-900">{config.loading}</p>
				<p className="text-sm text-slate-500">
					Waiting for host to assign colors...
				</p>
			</div>
		);
	}

	return (
		<div className="flex h-full w-full flex-col items-center justify-center space-y-8 px-4 py-8 sm:py-12">
			{/* Large color card with glow effect */}
			<div className="relative">
				{/* Glow effect */}
				<div
					className={`absolute -inset-4 rounded-[2rem] opacity-30 blur-2xl ${getColorClass(playerColor)}`}
				/>
				<div
					className={`relative flex h-44 w-44 items-center justify-center rounded-3xl shadow-2xl sm:h-64 sm:w-64 ${getColorClass(playerColor)}`}
				>
					{/* Gradient overlay for depth */}
					<div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/20 to-transparent" />
					<div className="relative px-4 text-center">
						<p className="text-base font-light tracking-wide text-white/90 sm:text-xl">
							You are
						</p>
						<p className="mt-1 line-clamp-3 text-3xl font-bold break-words text-white drop-shadow-sm sm:text-5xl">
							{colorNames[playerColor]}
						</p>
					</div>
				</div>
			</div>

			{/* Instructions */}
			<div className="prose prose-sm sm:prose w-full max-w-sm text-center">
				<Markdown>{config.colorAssignmentMd}</Markdown>
			</div>

			{/* Modern waiting indicator with bouncing dots */}
			<div className="flex items-center gap-3">
				<div className="flex gap-1">
					<span className="size-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
					<span className="size-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
					<span className="size-2 animate-bounce rounded-full bg-slate-400" />
				</div>
				<p className="text-base font-medium text-slate-500 sm:text-lg">
					{config.waitingForRoundMd}
				</p>
			</div>
		</div>
	);
};
