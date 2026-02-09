import { config } from '@/config';
import { useServerTimer } from '@/hooks/useServerTime';
import { kmClient } from '@/services/km-client';
import { globalActions } from '@/state/actions/global-actions';
import { roundActions } from '@/state/actions/round-actions';
import {
	globalStore,
	type PresenterVisualizationMode
} from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { useSnapshot } from '@kokimoki/app';
import { KmTimeCountdown } from '@kokimoki/shared';
import {
	BarChart3,
	Circle,
	CirclePlay,
	CircleStop,
	Network,
	PieChart,
	Sparkles,
	Users
} from 'lucide-react';
import * as React from 'react';

const visualizationModes: {
	mode: PresenterVisualizationMode;
	label: string;
	icon: React.ElementType;
}[] = [
	{ mode: 'pulse', label: config.visualizationPulseLabel, icon: Sparkles },
	{ mode: 'network', label: config.visualizationNetworkLabel, icon: Network },
	{ mode: 'bars', label: config.visualizationBarsLabel, icon: BarChart3 },
	{ mode: 'bubbles', label: config.visualizationBubblesLabel, icon: Circle },
	{ mode: 'pie', label: config.visualizationPieLabel, icon: PieChart }
];

export const ColorRoundControlView: React.FC = () => {
	const {
		roundNumber,
		totalRounds,
		roundStartTimestamp,
		roundActive,
		roundDurationSeconds,
		playerColors,
		presenterVisualizationMode
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
			<div className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-2.5 shadow-sm ring-1 ring-blue-100/80">
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
				<p className="text-sm font-medium text-slate-500">
					{config.roundNumber} {roundNumber} / {totalRounds}
				</p>
				{roundActive && (
					<p
						className={cn(
							'mt-2 text-7xl font-extrabold tracking-tight text-slate-900 tabular-nums',
							remainingMs < 10000 && 'km-timer-urgent'
						)}
					>
						<KmTimeCountdown ms={remainingMs} />
					</p>
				)}
				{roundActive && remainingMs < 10000 && (
					<p className="mt-2 text-lg font-semibold text-red-500">
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
						disabled={buttonCooldown || roundNumber >= totalRounds}
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
			<p className="text-center text-lg font-medium text-slate-600">
				{!roundActive ? (
					roundNumber >= totalRounds ? (
						<>{config.gameCompleteMessage}</>
					) : roundNumber === 0 ? (
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

			{/* Visualization mode selector */}
			<div className="mt-4 flex flex-col items-center gap-3">
				<p className="text-sm font-medium text-slate-500">
					{config.visualizationModeLabel}
				</p>
				<div className="flex flex-wrap justify-center gap-2">
					{visualizationModes.map(({ mode, label, icon: Icon }) => (
						<button
							key={mode}
							type="button"
							onClick={() => globalActions.setPresenterVisualizationMode(mode)}
							className={cn(
								'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
								presenterVisualizationMode === mode
									? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
									: 'bg-white text-slate-600 shadow-sm ring-1 ring-slate-200/80 hover:bg-slate-50 hover:shadow-md'
							)}
							title={label}
						>
							<Icon className="size-4" />
							<span className="hidden sm:inline">{label}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
};
