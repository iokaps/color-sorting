import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { roundActions } from '@/state/actions/round-actions';
import { globalStore, type ColorName } from '@/state/stores/global-store';
import { useSnapshot } from '@kokimoki/app';
import { useKmConfettiContext } from '@kokimoki/shared';
import { CircleArrowRight } from 'lucide-react';
import * as React from 'react';

const COLOR_CLASSES: Record<ColorName, string> = {
	red: 'bg-rose-600',
	blue: 'bg-blue-700',
	green: 'bg-emerald-600',
	yellow: 'bg-amber-600'
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
	const confetti = useKmConfettiContext();

	// Find winning color
	const winningColor = COLORS.reduce((prev, curr) =>
		roundResults[curr] > roundResults[prev] ? curr : prev
	);
	const winningCount = roundResults[winningColor];

	// Trigger confetti on mount
	React.useEffect(() => {
		if (confetti) {
			// Use 'standard' preset for player results view
			confetti.triggerConfetti({ preset: 'standard' });
		}
	}, [confetti]);

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
		<div className="flex h-full w-full flex-col items-center justify-center gap-6 overflow-auto px-3 py-6 sm:gap-8 sm:px-4 sm:py-8">
			{/* Winner announcement */}
			<div
				className={`w-full max-w-xl rounded-2xl px-4 py-6 shadow-2xl sm:rounded-3xl sm:px-8 sm:py-8 ${COLOR_CLASSES[winningColor]}`}
			>
				<p className="text-center text-2xl font-bold break-words text-white sm:text-3xl md:text-4xl">
					{config.winnerAnnouncement
						.replace('{color}', colorNames[winningColor])
						.replace('{count}', winningCount.toString())}
				</p>
			</div>

			{/* Results table */}
			<div className="w-full max-w-xl space-y-3 px-2 sm:space-y-4">
				<h2 className="text-center text-lg font-bold text-slate-900 sm:text-xl">
					{config.roundResultsMd.replace(
						'{roundNumber}',
						roundNumber.toString()
					)}
				</h2>

				<div className="grid grid-cols-2 gap-2 sm:gap-3">
					{COLORS.map((color) => (
						<div
							key={color}
							className={`rounded-lg px-3 py-3 text-center text-white shadow-lg sm:rounded-2xl sm:px-6 sm:py-4 ${COLOR_CLASSES[color]}`}
						>
							<p className="text-3xl sm:text-4xl">{COLOR_EMOJIS[color]}</p>
							<p className="mt-1 text-xs font-semibold sm:mt-2 sm:text-sm">
								{colorNames[color]}
							</p>
							<p className="text-2xl font-bold sm:text-3xl">
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
					className="km-btn-primary h-12 w-full max-w-xs sm:max-w-sm"
					onClick={handleNextRound}
					disabled={buttonCooldown}
				>
					<CircleArrowRight className="size-5" />
					{config.nextRoundButton}
				</button>
			)}

			{/* Waiting message */}
			{!isHost && (
				<p className="animate-pulse text-center text-base font-semibold text-slate-600 sm:text-lg">
					Waiting for next round...
				</p>
			)}
		</div>
	);
};
