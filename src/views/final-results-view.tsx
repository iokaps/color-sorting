import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { roundActions } from '@/state/actions/round-actions';
import { globalStore, type ColorName } from '@/state/stores/global-store';
import { useSnapshot } from '@kokimoki/app';
import { useKmConfettiContext } from '@kokimoki/shared';
import { RotateCcw, Trophy } from 'lucide-react';
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

export const FinalResultsView: React.FC = () => {
	const { roundHistory, totalRounds } = useSnapshot(globalStore.proxy);
	const isHost = kmClient.clientContext.mode === 'host';
	const confetti = useKmConfettiContext();
	const [buttonCooldown, setButtonCooldown] = React.useState(false);

	// Trigger confetti on mount (only once)
	React.useEffect(() => {
		if (confetti) {
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

	const handlePlayAgain = async () => {
		setButtonCooldown(true);
		try {
			await roundActions.resetGame();
		} catch (error) {
			console.error('Failed to reset game:', error);
			setButtonCooldown(false);
		}
	};

	// Get sorted round results
	const sortedRounds = Object.entries(roundHistory)
		.sort(([a], [b]) => Number(a) - Number(b))
		.map(([roundNum, result]) => ({
			roundNumber: Number(roundNum),
			...result
		}));

	// Count wins per color
	const winCounts: Record<ColorName, number> = {
		red: 0,
		blue: 0,
		green: 0,
		yellow: 0
	};
	sortedRounds.forEach((result) => {
		winCounts[result.winningColor]++;
	});

	// Find overall winner
	const overallWinner = (
		Object.entries(winCounts) as [ColorName, number][]
	).reduce(
		(prev, curr) => (curr[1] > prev[1] ? curr : prev),
		['red' as ColorName, 0]
	);

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-3 overflow-auto px-2 py-3 sm:gap-5 sm:px-4 sm:py-6">
			{/* Title */}
			<div className="text-center">
				<Trophy className="mx-auto mb-1 size-8 text-yellow-500 sm:size-12" />
				<h1 className="text-xl font-bold text-slate-900 sm:text-3xl">
					{config.finalResultsTitle}
				</h1>
				<p className="mt-1 text-xs text-slate-600 sm:text-sm">
					{config.gameCompleteMessage}
				</p>
			</div>

			{/* Overall winner banner */}
			{overallWinner[1] > 0 && (
				<div
					className={`w-full max-w-md rounded-xl px-4 py-3 text-center text-white shadow-lg sm:rounded-2xl sm:px-6 sm:py-4 ${COLOR_CLASSES[overallWinner[0]]}`}
				>
					<p className="text-2xl sm:text-4xl">
						{COLOR_EMOJIS[overallWinner[0]]}
					</p>
					<p className="mt-1 text-base font-bold sm:text-xl">
						{sortedRounds.find((r) => r.winningColor === overallWinner[0])
							?.winningColorName || overallWinner[0]}{' '}
						wins with {overallWinner[1]}{' '}
						{overallWinner[1] === 1 ? 'round' : 'rounds'}!
					</p>
				</div>
			)}

			{/* Round history */}
			<div className="w-full max-w-md space-y-2 sm:space-y-3">
				<h2 className="text-center text-sm font-semibold text-slate-700 sm:text-base">
					Round History ({sortedRounds.length}/{totalRounds})
				</h2>

				<div className="space-y-1.5 sm:space-y-2">
					{sortedRounds.map((result) => (
						<div
							key={result.roundNumber}
							className={`flex items-center justify-between rounded-lg px-3 py-2 text-white shadow-md sm:rounded-xl sm:px-4 sm:py-3 ${COLOR_CLASSES[result.winningColor]}`}
						>
							<div className="flex items-center gap-2">
								<span className="text-lg sm:text-2xl">
									{COLOR_EMOJIS[result.winningColor]}
								</span>
								<div>
									<p className="text-[10px] font-medium opacity-90 sm:text-xs">
										{config.roundWinnerLabel.replace(
											'{roundNumber}',
											result.roundNumber.toString()
										)}
									</p>
									<p className="text-sm font-bold sm:text-base">
										{result.winningColorName}
									</p>
								</div>
							</div>
							<div className="text-right">
								<p className="text-base font-bold sm:text-lg">
									{result.connectionCount}
								</p>
								<p className="text-[10px] opacity-80 sm:text-xs">
									{config.connectionsLabel.replace(
										'{count}',
										result.connectionCount.toString()
									)}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Play again button (host only) */}
			{isHost && (
				<button
					type="button"
					className="km-btn-primary h-10 text-sm sm:h-11"
					onClick={handlePlayAgain}
					disabled={buttonCooldown}
				>
					<RotateCcw className="size-4" />
					{config.playAgainButton}
				</button>
			)}
		</div>
	);
};
