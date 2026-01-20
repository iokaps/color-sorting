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
		<div className="flex h-full w-full flex-col items-center justify-center gap-4 overflow-auto px-2 py-4 sm:gap-6 sm:px-4 sm:py-6">
			{/* Winner announcement with glow */}
			<div className="relative w-full max-w-md">
				<div
					className={`absolute -inset-2 rounded-3xl opacity-40 blur-xl ${getColorClass(winningColor)}`}
				/>
				<div
					className={`relative overflow-hidden rounded-2xl px-4 py-5 shadow-xl sm:px-6 sm:py-6 ${getColorClass(winningColor)}`}
				>
					<div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
					<div className="relative flex items-center justify-center gap-2">
						<Trophy className="size-6 text-white drop-shadow sm:size-8" />
						<p className="text-center text-xl font-bold text-white drop-shadow sm:text-3xl">
							{winningColors.map((c) => colorNames[c]).join(' & ')}
							wins!
						</p>
					</div>
					<p className="relative mt-2 text-center text-sm font-medium text-white/90 sm:text-base">
						{maxFactionSize} players connected
					</p>
				</div>
			</div>

			{/* Results table */}
			<div className="w-full max-w-md space-y-2 sm:space-y-3">
				<h2 className="text-center text-sm font-bold text-slate-900 sm:text-lg">
					{config.roundResultsMd.replace(
						'{roundNumber}',
						roundNumber.toString()
					)}
				</h2>

				<div className="grid grid-cols-2 gap-2 sm:gap-3">
					{COLORS.map((color) => {
						const isWinner = winningColors.includes(color);
						return (
							<div
								key={color}
								className={cn(
									'relative overflow-hidden rounded-xl px-3 py-3 text-center text-white shadow-md transition-all sm:px-4 sm:py-4',
									getColorClass(color),
									isWinner && 'ring-2 ring-yellow-300 ring-offset-2'
								)}
							>
								<div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent" />
								<div className="relative">
									{isWinner && (
										<p className="text-xs font-bold text-yellow-200 sm:text-sm">
											{config.winnerBadge}
										</p>
									)}
									<p className="text-sm font-semibold drop-shadow-sm sm:text-base">
										{colorNames[color]}
									</p>
									<p className="text-xl font-bold drop-shadow-sm sm:text-2xl">
										{roundResults[color]}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Cumulative Leaderboard */}
			{Object.keys(playerScores).length > 0 && (
				<div className="km-card w-full max-w-md">
					<h3 className="mb-3 text-center text-sm font-bold text-slate-900 sm:text-base">
						{config.cumulativeLeaderboardLabel}
					</h3>
					<div className="space-y-2">
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
									className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 sm:px-4 sm:py-2.5"
								>
									<div className="flex items-center gap-2">
										<span className="flex size-6 items-center justify-center text-sm font-bold text-slate-500">
											{idx === 0 && '🥇'}
											{idx === 1 && '🥈'}
											{idx === 2 && '🥉'}
											{idx > 2 && `#${idx + 1}`}
										</span>
										<span className="text-sm font-semibold text-slate-900">
											{player.name}
										</span>
									</div>
									<span className="text-sm font-bold text-slate-900">
										{player.totalScore}
									</span>
								</div>
							))}
						)
					</div>
				</div>
			)}

			{/* Faction Size Comparison */}
			<div className="km-card w-full max-w-md space-y-3">
				<h3 className="text-center text-sm font-bold text-slate-900">
					{config.factionComparisonLabel}
				</h3>
				{COLORS.map((color) => {
					const totalPlayers = Object.keys(playerScores).length;
					const percentage =
						totalPlayers > 0 ? (roundResults[color] / totalPlayers) * 100 : 0;
					const isWinner = winningColors.includes(color);

					return (
						<div key={color} className="space-y-1.5">
							<div className="flex items-center justify-between">
								<span className="text-sm font-semibold text-slate-900">
									{colorNames[color]}
								</span>
								<span className="text-sm font-bold text-slate-700">
									{roundResults[color]} {config.factionSizeLabel.toLowerCase()}
								</span>
							</div>
							<div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
								<div
									className={`h-full transition-all duration-500 ${
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
			<div className="rounded-full bg-slate-100 px-4 py-1.5 text-center text-sm font-medium text-slate-600">
				Round {roundNumber} of {totalRounds}
			</div>

			{/* Next round button (host only) */}
			{isHost && (
				<button
					type="button"
					className="km-btn-primary h-11 w-full max-w-xs sm:max-w-sm"
					onClick={handleNextRound}
					disabled={buttonCooldown}
				>
					<CircleArrowRight className="size-5" />
					{config.nextRoundButton}
				</button>
			)}

			{/* Waiting message */}
			{!isHost && (
				<div className="flex items-center gap-2 text-sm font-medium text-slate-500">
					<div className="flex gap-1">
						<span className="size-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
						<span className="size-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
						<span className="size-1.5 animate-bounce rounded-full bg-slate-400" />
					</div>
					{config.waitingForNextRoundMd}
				</div>
			)}
		</div>
	);
};
