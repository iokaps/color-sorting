import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { roundActions } from '@/state/actions/round-actions';
import { globalStore, type ColorName } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { generateColorArray, getColorClass } from '@/utils/color-utils';
import { useSnapshot } from '@kokimoki/app';
import { useKmConfettiContext } from '@kokimoki/shared';
import { CircleArrowRight, Trophy } from 'lucide-react';
import * as React from 'react';

export const ColorResultsView: React.FC = () => {
	const {
		roundNumber,
		totalRounds,
		roundResults,
		colorNames,
		numberOfColors,
		playerScores
	} = useSnapshot(globalStore.proxy);
	const isHost = kmClient.clientContext.mode === 'host';
	const [buttonCooldown, setButtonCooldown] = React.useState(false);
	const confetti = useKmConfettiContext();

	// Get dynamic colors based on numberOfColors
	const COLORS = generateColorArray(numberOfColors);

	// Find winning colors (support ties)
	const maxFactionSize = Math.max(...COLORS.map((c) => roundResults[c]));
	const winningColors = COLORS.filter(
		(c) => roundResults[c] === maxFactionSize
	);
	const winningColor = winningColors[0];

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

	// Helper to get gradient colors for progress bars
	const getBackgroundGradient = (color: ColorName): string => {
		const gradients: Record<ColorName, string> = {
			red: 'from-red-400 to-red-500',
			blue: 'from-blue-400 to-blue-500',
			green: 'from-green-400 to-green-500',
			yellow: 'from-yellow-400 to-yellow-500',
			purple: 'from-purple-400 to-purple-500',
			pink: 'from-pink-400 to-pink-500',
			indigo: 'from-indigo-400 to-indigo-500',
			cyan: 'from-cyan-400 to-cyan-500',
			orange: 'from-orange-400 to-orange-500',
			lime: 'from-lime-400 to-lime-500'
		};
		return gradients[color] || 'from-slate-400 to-slate-500';
	};

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-3 overflow-auto px-2 py-3 sm:gap-5 sm:px-4 sm:py-6">
			{/* Winner announcement */}
			<div
				className={`w-full max-w-md rounded-xl px-3 py-4 shadow-xl sm:rounded-2xl sm:px-6 sm:py-6 ${getColorClass(winningColor)}`}
			>
				<div className="flex items-center justify-center gap-2">
					<Trophy className="size-5 text-white sm:size-6" />
					<p className="text-center text-lg font-bold break-words text-white sm:text-2xl">
						{winningColors.map((c) => colorNames[c]).join(' & ')}
						wins!
					</p>
				</div>
				<p className="mt-2 text-center text-sm text-white/90 sm:text-base">
					{maxFactionSize} players connected
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
					{COLORS.map((color) => {
						const isWinner = winningColors.includes(color);
						return (
							<div
								key={color}
								className={cn(
									'rounded-lg px-2 py-2 text-center text-white shadow-md transition-all sm:rounded-xl sm:px-4 sm:py-3',
									getColorClass(color),
									isWinner && 'ring-2 ring-yellow-300'
								)}
							>
								{isWinner && (
									<p className="text-xs font-bold text-yellow-200 sm:text-sm">
										★ WINNER ★
									</p>
								)}
								<p className="text-sm font-semibold sm:text-base">
									{colorNames[color]}
								</p>
								<p className="text-lg font-bold sm:text-xl">
									{roundResults[color]}
								</p>
							</div>
						);
					})}
				</div>
			</div>

			{/* Cumulative Leaderboard */}
			{Object.keys(playerScores).length > 0 && (
				<div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-3 sm:rounded-2xl sm:p-4">
					<h3 className="mb-2 text-center text-sm font-bold text-slate-900 sm:mb-3 sm:text-base">
						{config.cumulativeLeaderboardLabel}
					</h3>
					<div className="space-y-1.5 sm:space-y-2">
						{Object.entries(playerScores)
							.map(([, player]) => ({
								name: player.name,
								totalScore: player.totalScore
							}))
							.sort((a, b) => b.totalScore - a.totalScore)
							.slice(0, 5)
							.map((player, idx) => (
								<div
									key={idx}
									className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5 sm:px-3 sm:py-2"
								>
									<div className="flex items-center gap-2">
										<span className="text-xs font-bold text-slate-500 sm:text-sm">
											#{idx + 1}
										</span>
										<span className="text-xs font-semibold text-slate-900 sm:text-sm">
											{player.name}
										</span>
									</div>
									<span className="text-xs font-bold text-slate-900 sm:text-sm">
										{player.totalScore}
									</span>
								</div>
							))}
					</div>
				</div>
			)}

			{/* Faction Size Comparison */}
			<div className="w-full max-w-md space-y-2 rounded-lg border border-slate-200 bg-white p-3 sm:space-y-3 sm:rounded-2xl sm:p-4">
				<h3 className="text-center text-xs font-bold text-slate-900 sm:text-sm">
					Faction Comparison
				</h3>
				{COLORS.map((color) => {
					const totalPlayers = Object.keys(playerScores).length;
					const percentage =
						totalPlayers > 0 ? (roundResults[color] / totalPlayers) * 100 : 0;
					const isWinner = winningColors.includes(color);

					return (
						<div key={color} className="space-y-1">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-slate-900 sm:text-sm">
									{colorNames[color]}
								</span>
								<span className="text-xs font-bold text-slate-700 sm:text-sm">
									{roundResults[color]} {config.factionSizeLabel.toLowerCase()}
								</span>
							</div>
							<div className="h-2 overflow-hidden rounded-full bg-slate-200">
								<div
									className={`h-full transition-all ${
										isWinner
											? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
											: `bg-gradient-to-r ${getBackgroundGradient(color)}`
									}`}
									style={{
										width: `${percentage}%`
									}}
								/>
							</div>
						</div>
					);
				})}
			</div>

			{/* Round progress */}
			<div className="text-center text-xs text-slate-600 sm:text-sm">
				Round {roundNumber} of {totalRounds}
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
				<p className="animate-pulse text-center text-xs font-semibold text-slate-600 sm:text-sm">
					Waiting for next round...
				</p>
			)}
		</div>
	);
};
