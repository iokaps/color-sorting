import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { roundActions } from '@/state/actions/round-actions';
import { globalStore } from '@/state/stores/global-store';
import { generateColorArray, getColorClass } from '@/utils/color-utils';
import { useSnapshot } from '@kokimoki/app';
import { useKmConfettiContext } from '@kokimoki/shared';
import { CircleArrowRight } from 'lucide-react';
import * as React from 'react';

export const ColorResultsView: React.FC = () => {
	const { roundNumber, roundResults, colorNames, numberOfColors } = useSnapshot(
		globalStore.proxy
	);
	const isHost = kmClient.clientContext.mode === 'host';
	const [buttonCooldown, setButtonCooldown] = React.useState(false);
	const confetti = useKmConfettiContext();

	// Get dynamic colors based on numberOfColors
	const COLORS = generateColorArray(numberOfColors);

	// Find winning color
	const winningColor = COLORS.reduce((prev, curr) =>
		roundResults[curr] > roundResults[prev] ? curr : prev
	);
	const winningCount = roundResults[winningColor];

	// Trigger confetti on mount (only once)
	React.useEffect(() => {
		if (confetti) {
			// Use 'standard' preset for player results view
			confetti.triggerConfetti({ preset: 'standard' });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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
		<div className="flex h-full w-full flex-col items-center justify-center gap-3 overflow-auto px-2 py-3 sm:gap-5 sm:px-4 sm:py-6">
			{/* Winner announcement */}
			<div
				className={`w-full max-w-md rounded-xl px-3 py-4 shadow-xl sm:rounded-2xl sm:px-6 sm:py-6 ${getColorClass(winningColor)}`}
			>
				<p className="text-center text-lg font-bold break-words text-white sm:text-2xl">
					{config.winnerAnnouncement
						.replace('{color}', colorNames[winningColor])
						.replace('{count}', winningCount.toString())}
				</p>
			</div>

			{/* Results table */}
			<div className="w-full max-w-md space-y-2 sm:space-y-3">
				<h2 className="text-center text-sm font-bold text-slate-900 sm:text-lg">
					{config.roundResultsMd.replace(
						'{roundNumber}',
						roundNumber.toString()
					)}
				</h2>

				<div className="grid grid-cols-2 gap-1.5 sm:gap-2">
					{COLORS.map((color) => (
						<div
							key={color}
							className={`rounded-lg px-2 py-2 text-center text-white shadow-md sm:rounded-xl sm:px-4 sm:py-3 ${getColorClass(color)}`}
						>
							<p className="text-sm font-semibold sm:text-base">
								{colorNames[color]}
							</p>
							<p className="text-lg font-bold sm:text-xl">
								{roundResults[color]}
							</p>
						</div>
					))}
				</div>
			</div>

			{/* Next round button (host only) */}
			{isHost && (
				<button
					type="button"
					className="km-btn-primary h-10 w-full max-w-xs text-sm sm:h-11 sm:max-w-sm"
					onClick={handleNextRound}
					disabled={buttonCooldown}
				>
					<CircleArrowRight className="size-4" />
					{config.nextRoundButton}
				</button>
			)}

			{/* Waiting message */}
			{!isHost && (
				<p className="animate-pulse text-center text-sm font-semibold text-slate-600 sm:text-base">
					Waiting for next round...
				</p>
			)}
		</div>
	);
};
