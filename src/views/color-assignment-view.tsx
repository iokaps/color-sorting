import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { globalStore, type ColorName } from '@/state/stores/global-store';
import { useSnapshot } from '@kokimoki/app';
import * as React from 'react';
import Markdown from 'react-markdown';

const COLOR_CLASSES: Record<ColorName, string> = {
	red: 'bg-red-500',
	blue: 'bg-blue-500',
	green: 'bg-green-500',
	yellow: 'bg-yellow-400'
};

export const ColorAssignmentView: React.FC = () => {
	const { playerColors, colorNames } = useSnapshot(globalStore.proxy);

	// Get current player's color
	const playerColor = playerColors[kmClient.id];

	if (!playerColor) {
		return (
			<div className="flex h-full flex-col items-center justify-center">
				<p className="text-lg">{config.loading}</p>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col items-center justify-center space-y-8 p-4">
			{/* Large color card */}
			<div
				className={`flex h-64 w-64 items-center justify-center rounded-3xl shadow-2xl ${COLOR_CLASSES[playerColor]}`}
			>
				<div className="text-center">
					<p className="text-2xl font-light text-white/80">You are</p>
					<p className="text-6xl font-bold text-white">
						{colorNames[playerColor]}
					</p>
				</div>
			</div>

			{/* Instructions */}
			<div className="prose prose-invert text-center">
				<Markdown>{config.colorAssignmentMd}</Markdown>
			</div>

			{/* Waiting message */}
			<p className="animate-pulse text-xl font-semibold text-slate-600">
				Waiting for round to start...
			</p>
		</div>
	);
};
