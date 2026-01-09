import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { roundActions } from '@/state/actions/round-actions';
import { globalStore, type ColorName } from '@/state/stores/global-store';
import { useSnapshot } from '@kokimoki/app';
import { CircleArrowRight } from 'lucide-react';
import * as React from 'react';

const COLOR_CLASSES: Record<ColorName, string> = {
	red: 'bg-red-500',
	blue: 'bg-blue-500',
	green: 'bg-green-500',
	yellow: 'bg-yellow-400'
};

const COLOR_EMOJIS: Record<ColorName, string> = {
	red: '🔴',
	blue: '🔵',
	green: '🟢',
	yellow: '🟡'
};

const COLORS: ColorName[] = ['red', 'blue', 'green', 'yellow'];

export const ColorResultsView: React.FC = () => {
	const { roundNumber, roundResults, colorNames } = useSnapshot(
		globalStore.proxy
	);
	const isHost = kmClient.clientContext.mode === 'host';
	const [buttonCooldown, setButtonCooldown] = React.useState(false);

	// Find winning color
	const winningColor = COLORS.reduce((prev, curr) =>
		roundResults[curr] > roundResults[prev] ? curr : prev
	);
	const winningCount = roundResults[winningColor];

	// Button cooldown
	React.useEffect(() => {
		if (!buttonCooldown) return;
		const timeout = setTimeout(() => {
			setButtonCooldown(false);
		}, 1000);
		return () => clearTimeout(timeout);
	}, [buttonCooldown]);

	const handleNextRound = async () => {
		setButtonCooldown(true);
		try {
			await roundActions.nextRound();
		} catch (error) {
			console.error('Failed to start next round:', error);
			setButtonCooldown(false);
		}
	};

	return (
		<div className="flex h-full flex-col items-center justify-center space-y-8 overflow-auto p-6">
			{/* Winner announcement */}
			<div
				className={`rounded-3xl px-12 py-8 shadow-2xl ${COLOR_CLASSES[winningColor]}`}
			>
				<p className="text-6xl">
					{config.winnerAnnouncement
						.replace('{color}', colorNames[winningColor])
						.replace('{count}', winningCount.toString())}
				</p>
			</div>

			{/* Results table */}
			<div className="w-full max-w-2xl space-y-4">
				<h2 className="text-center text-2xl font-bold text-slate-900">
					{config.roundResultsMd.replace(
						'{roundNumber}',
						roundNumber.toString()
					)}
				</h2>

				<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
					{COLORS.map((color) => (
						<div
							key={color}
							className={`rounded-2xl px-6 py-4 text-center text-white shadow-lg ${COLOR_CLASSES[color]}`}
						>
							<p className="text-4xl">{COLOR_EMOJIS[color]}</p>
							<p className="mt-2 font-semibold">{colorNames[color]}</p>
							<p className="text-3xl font-bold">{roundResults[color]}</p>
						</div>
					))}
				</div>
			</div>

			{/* Next round button (host only) */}
			{isHost && (
				<button
					type="button"
					className="km-btn-primary"
					onClick={handleNextRound}
					disabled={buttonCooldown}
				>
					<CircleArrowRight className="size-5" />
					{config.nextRoundButton}
				</button>
			)}

			{/* Waiting message */}
			{!isHost && (
				<p className="animate-pulse text-center text-lg font-semibold text-slate-600">
					Waiting for next round...
				</p>
			)}
		</div>
	);
};
