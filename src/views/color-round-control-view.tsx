import { config } from '@/config';
import { useServerTimer } from '@/hooks/useServerTime';
import { kmClient } from '@/services/km-client';
import { roundActions } from '@/state/actions/round-actions';
import { globalStore } from '@/state/stores/global-store';
import { useSnapshot } from '@kokimoki/app';
import { KmTimeCountdown } from '@kokimoki/shared';
import { CirclePlay, CircleStop } from 'lucide-react';
import * as React from 'react';

export const ColorRoundControlView: React.FC = () => {
	const {
		roundNumber,
		roundStartTimestamp,
		roundActive,
		roundDurationSeconds
	} = useSnapshot(globalStore.proxy);
	const [buttonCooldown, setButtonCooldown] = React.useState(false);
	const serverTime = useServerTimer();

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
			{/* Round info */}
			<div className="text-center">
				<p className="text-5xl font-bold text-blue-600">
					{config.roundNumber} {roundNumber}
				</p>
			</div>

			{/* Timer */}
			{roundActive && (
				<div className="text-center">
					<p className="text-sm text-slate-600">Time remaining</p>
					<p className="text-6xl font-bold text-slate-900">
						<KmTimeCountdown ms={remainingMs} />
					</p>
					{remainingMs < 10000 && (
						<p className="animate-pulse text-lg font-semibold text-red-600">
							Almost time!
						</p>
					)}
				</div>
			)}

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
						{config.assignColorsButton}
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
					<>Click &quot;Assign Colors&quot; to start a new round</>
				) : (
					<>Round {roundNumber} is active. Players are connecting...</>
				)}
			</p>
		</div>
	);
};
