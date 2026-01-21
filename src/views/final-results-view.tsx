import { config } from '@/config';
import { useButtonCooldown } from '@/hooks/useButtonCooldown';
import { kmClient } from '@/services/km-client';
import { roundActions } from '@/state/actions/round-actions';
import { globalStore, type ColorName } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { getColorClass } from '@/utils/color-utils';
import { useSnapshot } from '@kokimoki/app';
import { useKmConfettiContext } from '@kokimoki/shared';
import { RotateCcw, Trophy } from 'lucide-react';
import * as React from 'react';

export const FinalResultsView: React.FC = () => {
	const { roundHistory, playerScores, colorNames } = useSnapshot(
		globalStore.proxy
	);
	const isPresenter = kmClient.clientContext.mode === 'presenter';
	const confetti = useKmConfettiContext();
	const [isCoolingDown, startCooldown] = useButtonCooldown(1000);
	const [expandedPlayer, setExpandedPlayer] = React.useState<string | null>(
		null
	);

	// Trigger confetti on mount (only once)
	React.useEffect(() => {
		if (confetti) {
			confetti.triggerConfetti({ preset: 'standard' });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handlePlayAgain = async () => {
		startCooldown();
		try {
			await roundActions.resetGame();
		} catch (error) {
			console.error('Failed to reset game:', error);
		}
	};

	// Helper to get text color based on background color for contrast
	const getTextColorForBg = (color: ColorName): string => {
		const lightColors = ['yellow', 'pink', 'cyan', 'lime'];
		return lightColors.includes(color) ? 'text-slate-900' : 'text-white';
	};

	// Get sorted round results (with defensive check for undefined roundHistory)
	const sortedRounds = (roundHistory ? Object.entries(roundHistory) : [])
		.sort(([a], [b]) => Number(a) - Number(b))
		.map(([roundNum, result]) => ({
			roundNumber: Number(roundNum),
			...result
		}));

	// Get leaderboard sorted by total score
	const leaderboard = Object.entries(playerScores)
		.map(([clientId, playerScore]) => ({
			clientId,
			...playerScore
		}))
		.sort((a, b) => b.totalScore - a.totalScore);

	// Find top scorer(s) for tie handling
	const topScore = leaderboard[0]?.totalScore || 0;
	const topPlayers = leaderboard.filter((p) => p.totalScore === topScore);

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-4 overflow-auto px-2 py-4 sm:gap-6 sm:px-4 sm:py-6">
			{/* Title */}
			<div className="text-center">
				<div className="relative mx-auto mb-2 inline-block">
					<div className="absolute -inset-3 rounded-full bg-yellow-400/30 blur-xl" />
					<Trophy className="relative size-10 text-yellow-500 drop-shadow-lg sm:size-14" />
				</div>
				<h1
					className={cn(
						'text-2xl font-bold sm:text-4xl',
						isPresenter ? 'text-white' : 'text-slate-900'
					)}
				>
					{config.finalResultsTitle}
				</h1>
				<p
					className={cn(
						'mt-1 text-sm sm:text-base',
						isPresenter ? 'text-slate-300' : 'text-slate-500'
					)}
				>
					{config.gameCompleteMessage}
				</p>
			</div>

			{/* Overall winner banner with tie handling */}
			{topScore > 0 && (
				<div className="relative w-full max-w-md">
					<div className="absolute -inset-2 rounded-3xl bg-yellow-400/40 blur-xl" />
					<div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-4 text-center shadow-xl sm:px-6 sm:py-5">
						<div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
						<div className="relative">
							<p className="text-sm font-semibold text-yellow-900/80 sm:text-base">
								{topPlayers.length > 1
									? config.tiedForFirstLabel
									: config.winnerLabel}
							</p>
							<div className="mt-2 space-y-1">
								{topPlayers.map((player) => (
									<div key={player.clientId}>
										<p className="text-xl font-bold text-white drop-shadow sm:text-3xl">
											{player.name}
										</p>
										<p className="text-sm font-semibold text-yellow-900/70 sm:text-base">
											{player.totalScore} {config.pointsLabel}
										</p>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Leaderboard */}
			<div className="w-full max-w-2xl space-y-3 sm:space-y-4">
				<h2
					className={cn(
						'text-center text-base font-semibold sm:text-lg',
						isPresenter ? 'text-slate-300' : 'text-slate-700'
					)}
				>
					{config.leaderboardTitle}
				</h2>

				<div className="space-y-2 sm:space-y-3">
					{leaderboard.map((player, index) => (
						<div
							key={player.clientId}
							className="shadow-card hover:shadow-card-hover overflow-hidden rounded-2xl bg-white transition-shadow"
						>
							{/* Main row - clickable to expand */}
							<button
								type="button"
								onClick={() =>
									setExpandedPlayer(
										expandedPlayer === player.clientId ? null : player.clientId
									)
								}
								className="w-full px-4 py-3 text-left hover:bg-slate-50 sm:px-5 sm:py-4"
							>
								<div className="flex items-center justify-between gap-3">
									<div className="flex min-w-0 items-center gap-3">
										{/* Medal for top 3 */}
										<div className="flex size-10 items-center justify-center text-xl font-bold sm:size-12 sm:text-2xl">
											{index === 0 && '🥇'}
											{index === 1 && '🥈'}
											{index === 2 && '🥉'}
											{index > 2 && (
												<span className="text-sm text-slate-400">
													{index + 1}
												</span>
											)}
										</div>
										<div className="min-w-0">
											<p className="truncate text-base font-semibold text-slate-900 sm:text-lg">
												{player.name}
											</p>
											<p className="text-sm text-slate-500">
												{Object.keys(player.roundScores).length}{' '}
												{config.roundsPlayedLabel}
											</p>
										</div>
									</div>
									<div className="text-right">
										<p className="text-xl font-bold text-slate-900 sm:text-2xl">
											{player.totalScore}
										</p>
										<p className="text-sm text-slate-500">
											{config.totalPointsLabel}
										</p>
									</div>
								</div>
							</button>

							{/* Expanded round details */}
							{expandedPlayer === player.clientId && (
								<div className="border-t border-slate-200 bg-slate-50 px-3 py-2 sm:px-4 sm:py-3">
									<div className="space-y-1.5 sm:space-y-2">
										<h4
											className={cn(
												'text-xs font-semibold sm:text-sm',
												isPresenter ? 'text-slate-300' : 'text-slate-700'
											)}
										>
											{config.roundBreakdownLabel}
										</h4>
										{sortedRounds.map((round) => {
											const roundScore =
												player.roundScores[round.roundNumber.toString()];
											if (!roundScore) return null;

											const isWinner = round.winningColors.includes(
												roundScore.color
											);

											return (
												<div
													key={round.roundNumber}
													className={cn(
														'flex items-center justify-between rounded px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm',
														getColorClass(roundScore.color),
														getTextColorForBg(roundScore.color as ColorName)
													)}
												>
													<div className={isPresenter ? 'text-white' : ''}>
														<p className="font-medium">
															Round {round.roundNumber}:{' '}
															<span className="font-bold">
																{colorNames[roundScore.color]}
															</span>
														</p>
														<p
															className={cn(
																'opacity-80',
																isPresenter ? 'text-white' : ''
															)}
														>
															{roundScore.connectionPoints}{' '}
															{roundScore.connectionPoints !== 1
																? config.connectionsLabel
																: config.connectionLabel}{' '}
															{isWinner &&
																`+ ${roundScore.bonusPoints} ${config.bonusLabel}`}
														</p>
													</div>
													<div className="text-right">
														<p className="font-bold">
															+{roundScore.totalRoundPoints}
														</p>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			</div>

			{/* Round summary */}
			{sortedRounds.length > 0 && (
				<div className="w-full max-w-md space-y-2 sm:space-y-3">
					<h3
						className={cn(
							'text-center text-sm font-semibold sm:text-base',
							isPresenter ? 'text-slate-300' : 'text-slate-700'
						)}
					>
						{config.roundResultsTitle}
					</h3>
					<div className="space-y-1.5 sm:space-y-2">
						{sortedRounds.map((result) => (
							<div
								key={result.roundNumber}
								className="rounded-lg bg-white px-3 py-2 shadow-md sm:px-4 sm:py-3"
							>
								<div className="flex items-center justify-between gap-2">
									<div>
										<p
											className={cn(
												'text-[10px] font-medium sm:text-xs',
												isPresenter ? 'text-slate-400' : 'text-slate-600'
											)}
										>
											{config.roundWinnerLabel.replace(
												'{roundNumber}',
												result.roundNumber.toString()
											)}
										</p>
										{result.winningColors.length > 1 ? (
											<p
												className={cn(
													'text-xs font-bold sm:text-sm',
													isPresenter ? 'text-white' : 'text-slate-900'
												)}
											>
												{config.tieLabel} {result.winningColorNames.join(', ')}
											</p>
										) : (
											<p
												className={cn(
													'text-xs font-bold sm:text-sm',
													isPresenter ? 'text-white' : 'text-slate-900'
												)}
											>
												{config.winnerLabel.replace('🌟 ', '')}{' '}
												<span
													className={`${getColorClass(result.winningColors[0])}`}
												>
													{result.winningColorNames[0]}
												</span>
											</p>
										)}
									</div>
									<div className="text-right">
										<p
											className={cn(
												'text-base font-bold sm:text-lg',
												isPresenter ? 'text-white' : 'text-slate-900'
											)}
										>
											{Number.isNaN(result.largestFactionSize)
												? '—'
												: result.largestFactionSize}
										</p>
										<p
											className={cn(
												'text-[10px] sm:text-xs',
												isPresenter ? 'text-slate-400' : 'text-slate-600'
											)}
										>
											{config.largestGroupLabel}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Play again button (host only) */}
			{!isPresenter && (
				<button
					type="button"
					className="km-btn-primary h-10 text-sm sm:h-11"
					onClick={handlePlayAgain}
					disabled={isCoolingDown}
				>
					<RotateCcw className="size-4" />
					{config.playAgainButton}
				</button>
			)}
		</div>
	);
};
