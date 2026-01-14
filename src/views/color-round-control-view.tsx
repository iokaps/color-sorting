import { config } from '@/config';
import { useServerTimer } from '@/hooks/useServerTime';
import { kmClient } from '@/services/km-client';
import { roundActions } from '@/state/actions/round-actions';
import { globalStore } from '@/state/stores/global-store';
import { useSnapshot } from '@kokimoki/app';
import { KmTimeCountdown } from '@kokimoki/shared';
import { CirclePlay, CircleStop, Users } from 'lucide-react';
import * as React from 'react';

export const ColorRoundControlView: React.FC = () => {
	const {
		roundNumber,
		totalRounds,
		roundStartTimestamp,
		roundActive,
		roundDurationSeconds,
		playerColors
	} = useSnapshot(globalStore.proxy);
	const connections = useSnapshot(globalStore.connections);
	const [buttonCooldown, setButtonCooldown] = React.useState(false);
	const serverTime = useServerTimer();

	// Count online players with colors vs total online
	const onlinePlayerIds = Array.from(connections.clientIds);
	const playersWithColors = onlinePlayerIds.filter(
		(id) => playerColors[id]
	).length;
	const totalOnline = onlinePlayerIds.length;

	// Calculate elapsed time in round
	const elapsedMs = Math.max(0, serverTime - roundStartTimestamp);
	const roundDurationMs = (roundDurationSeconds || 90) * 1000;
	const remainingMs = Math.max(0, roundDurationMs - elapsedMs);

	// Button cooldown to prevent accidental double-clicks
	React.useEffect(() => {
		if (!buttonCooldown) return;
		const timeout = setTimeout(() => {
			setButtonCooldown(false);
		}, 1000);
		return () => clearTimeout(timeout);
	}, [buttonCooldown]);

	const handleAssignColorsAndStart = async () => {
		setButtonCooldown(true);
		try {
			await roundActions.assignColorsAndStartRound();
		} catch (error) {
			console.error('Failed to assign colors and start round:', error);
			setButtonCooldown(false);
		}
	};

	const handleEndRound = async () => {
		setButtonCooldown(true);
		try {
			// Note: colorStores will be passed properly when endRound is called with dynamic stores
			// For now, we'll handle this in useGlobalController
			// This is just triggering the end action
			await kmClient.transact([globalStore], ([state]) => {
				state.roundActive = false;
			});
		} catch (error) {
			console.error('Failed to end round:', error);
			setButtonCooldown(false);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center space-y-8 p-6">
			{/* Connected players count */}
			<div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2">
				<Users className="size-5 text-blue-600" />
				<span className="text-lg font-semibold text-blue-900">
					{totalOnline} {config.players}
					{roundActive && playersWithColors < totalOnline && (
						<span className="ml-2 text-sm font-normal text-amber-600">
							({totalOnline - playersWithColors} {config.waitingForColorMd})
						</span>
					)}
				</span>
			</div>

			{/* Round info */}
			<div className="text-center">
				<p className="text-sm text-slate-600">
					{config.roundNumber} {roundNumber} / {totalRounds}
				</p>
				{roundActive && (
					<p className="mt-2 text-6xl font-bold text-slate-900">
						<KmTimeCountdown ms={remainingMs} />
					</p>
				)}
				{roundActive && remainingMs < 10000 && (
					<p className="mt-2 animate-pulse text-lg font-semibold text-red-600">
						{config.almostTimeMd}
					</p>
				)}
			</div>

			{/* Control buttons */}
			<div className="space-y-4">
				{!roundActive ? (
					<button
						type="button"
						className="km-btn-primary"
						onClick={handleAssignColorsAndStart}
						disabled={buttonCooldown}
					>
						<CirclePlay className="size-5" />
						{roundNumber === 0
							? config.assignColorsButton
							: config.nextRoundButton}
					</button>
				) : (
					<button
						type="button"
						className="km-btn-error"
						onClick={handleEndRound}
						disabled={buttonCooldown}
					>
						<CircleStop className="size-5" />
						{config.endRoundButton}
					</button>
				)}
			</div>

			{/* Status message */}
			<p className="text-center text-lg font-medium text-slate-700">
				{!roundActive ? (
					roundNumber === 0 ? (
						<>{config.clickToAssignColorsAndStartMd}</>
					) : (
						<>{config.clickToStartNextRoundMd}</>
					)
				) : (
					<>
						{config.roundActivePlayersConnectingMd.replace(
							'{roundNumber}',
							roundNumber.toString()
						)}
					</>
				)}
			</p>
		</div>
	);
};
