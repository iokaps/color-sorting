import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { globalStore, type ColorName } from '@/state/stores/global-store';
import { useSnapshot } from '@kokimoki/app';
import * as React from 'react';
import Markdown from 'react-markdown';

const COLOR_CLASSES: Record<ColorName, string> = {
	red: 'bg-rose-600',
	blue: 'bg-blue-700',
	green: 'bg-emerald-600',
	yellow: 'bg-amber-600'
};

export const ColorAssignmentView: React.FC = () => {
	const { playerColors, colorNames } = useSnapshot(globalStore.proxy);

	// Get current player's color
	const playerColor = playerColors[kmClient.id];

	if (!playerColor) {
		return (
			<div className="flex h-full flex-col items-center justify-center space-y-4">
				<p className="text-lg font-semibold text-slate-900">{config.loading}</p>
				<p className="text-sm text-slate-600">
					Waiting for host to assign colors...
				</p>
			</div>
		);
	}

	return (
		<div className="flex h-full w-full flex-col items-center justify-center space-y-6 px-4 py-8 sm:space-y-8 sm:py-12">
			{/* Large color card */}
			<div
				className={`flex h-40 w-40 items-center justify-center rounded-3xl shadow-2xl sm:h-64 sm:w-64 ${COLOR_CLASSES[playerColor]}`}
			>
				<div className="text-center">
					<p className="text-lg font-light text-white/80 sm:text-2xl">
						You are
					</p>
					<p className="text-4xl font-bold text-white sm:text-6xl">
						{colorNames[playerColor]}
					</p>
				</div>
			</div>

			{/* Instructions */}
			<div className="prose prose-sm sm:prose w-full max-w-sm text-center">
				<Markdown>{config.colorAssignmentMd}</Markdown>
			</div>

			{/* Waiting message */}
			<p className="animate-pulse text-lg font-semibold text-slate-600 sm:text-xl">
				Waiting for round to start...
			</p>
		</div>
	);
};
