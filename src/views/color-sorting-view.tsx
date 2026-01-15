import { QrScanner } from '@/components/qr-scanner';
import { config } from '@/config';
import { useDynamicStore } from '@/hooks/useDynamicStore';
import { registerColorStore } from '@/hooks/useGlobalController';
import { kmClient } from '@/services/km-client';
import { colorActions } from '@/state/actions/color-actions';
import {
	createColorFactionState,
	getColorStoreName
} from '@/state/stores/color-store';
import { globalStore, type ColorName } from '@/state/stores/global-store';
import { getColorClass } from '@/utils/color-utils';
import { useSnapshot } from '@kokimoki/app';
import { KmQrCode } from '@kokimoki/shared';
import { Scan } from 'lucide-react';
import * as React from 'react';

// Inner component that requires playerColor to be defined
const ColorSortingViewInner: React.FC<{ playerColor: ColorName }> = ({
	playerColor
}) => {
	const { colorNames } = useSnapshot(globalStore.proxy);
	const [showScanner, setShowScanner] = React.useState(false);
	const [feedback, setFeedback] = React.useState<string | null>(null);
	const [feedbackType, setFeedbackType] = React.useState<
		'success' | 'error' | 'info'
	>('info');

	// Get the dynamic store for this player's color
	const { store: colorStore, isConnected } = useDynamicStore(
		getColorStoreName(playerColor),
		createColorFactionState()
	);

	// Register store with global controller for access in useGlobalController hook
	React.useEffect(() => {
		if (isConnected) {
			registerColorStore(playerColor, colorStore);
		}
	}, [playerColor, colorStore, isConnected]);

	// Add this player to the faction when store connects
	React.useEffect(() => {
		if (!isConnected) return;

		const addPlayerToFaction = async () => {
			const maxRetries = 5;
			let lastError: Error | null = null;

			for (let attempt = 1; attempt <= maxRetries; attempt++) {
				try {
					await kmClient.transact([colorStore], ([state]) => {
						// Ensure state objects exist
						if (!state.players) state.players = {};
						if (!state.edges) state.edges = {};

						// Add this player to the faction if not already there
						const now = kmClient.serverTimestamp();
						if (!state.players[kmClient.id]) {
							state.players[kmClient.id] = { joinedAt: now };
						}
					});
					// Success - exit the retry loop
					return;
				} catch (error) {
					lastError = error as Error;

					// If it's a "Room not joined" error and we have retries left, wait and retry
					if (
						lastError?.message?.includes('Room not joined') &&
						attempt < maxRetries
					) {
						const waitMs = 200 * attempt;
						// Wait 200ms * attempt before retrying
						await new Promise((resolve) => setTimeout(resolve, waitMs));
						continue;
					}

					// For other errors or final attempt, just log and move on
					console.error(
						`Failed to add player to faction (attempt ${attempt}/${maxRetries}):`,
						error
					);
					return;
				}
			}

			// If we got here, all retries failed
			if (lastError) {
				console.error(
					'Failed to add player to faction after all retries:',
					lastError
				);
			}
		};

		addPlayerToFaction();
	}, [isConnected, colorStore]);

	// Get faction data for reactivity - when edges or players change, playerCount updates
	useSnapshot(colorStore.proxy);

	// Calculate this player's specific faction size (the faction they're part of)
	const playerCount = colorActions.getPlayerFactionSize(
		colorStore,
		kmClient.id
	);

	// Generate QR code URL with player's Kokimoki ID AND color
	const qrCodeUrl = `${window.location.origin}/join?playerCode=${kmClient.id}&color=${playerColor}`;

	const handleQrScan = async (scannedData: string) => {
		try {
			// Parse the scanned data to extract playerCode and color
			let scannedClientId = scannedData;
			let scannedColor: string | null = null;

			// If it's a URL, extract the parameters
			if (scannedData.includes('playerCode=')) {
				try {
					const url = new URL(scannedData);
					scannedClientId = url.searchParams.get('playerCode') || scannedData;
					scannedColor = url.searchParams.get('color');
				} catch {
					setFeedbackType('error');
					setFeedback(config.invalidQrCodeMd);
					setTimeout(() => setFeedback(null), 2000);
					setShowScanner(false);
					return;
				}
			}

			// Validate: both players must have the same color
			if (scannedColor && scannedColor !== playerColor) {
				setFeedbackType('error');
				setFeedback(
					config.wrongColorMd
						.replace(
							'{color}',
							colorNames[scannedColor as ColorName] || scannedColor
						)
						.replace('{yourColor}', colorNames[playerColor])
				);
				setTimeout(() => setFeedback(null), 3000);
				setShowScanner(false);
				return;
			}

			// Don't connect to yourself
			if (scannedClientId === kmClient.id) {
				setFeedbackType('info');
				setFeedback(config.ownQrCodeMd);
				setTimeout(() => setFeedback(null), 2000);
				setShowScanner(false);
				return;
			}

			// Try to join the faction
			const result = await colorActions.joinColorFaction(
				colorStore,
				scannedClientId
			);

			if (result.alreadyConnected) {
				setFeedbackType('info');
				setFeedback(config.alreadyConnectedMd);
			} else {
				setFeedbackType('success');
				setFeedback(config.connectedSuccessMd);
			}

			// Clear feedback after 3 seconds
			setTimeout(() => setFeedback(null), 3000);
		} catch {
			setFeedbackType('error');
			setFeedback(config.failedToConnectMd);
			setTimeout(() => setFeedback(null), 2000);
		}

		setShowScanner(false);
	};

	if (!isConnected) {
		return (
			<div className="flex h-full flex-col items-center justify-center">
				<p className="text-lg">{config.loading}</p>
			</div>
		);
	}

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-2 overflow-y-auto px-2 py-2 sm:gap-4 sm:px-4 sm:py-4">
			{/* Color reference + Group size in row */}
			<div className="flex items-center gap-3">
				<div
					className={`flex h-16 w-24 items-center justify-center rounded-lg shadow-md sm:h-20 sm:w-32 sm:rounded-xl ${getColorClass(playerColor)}`}
				>
					<p className="line-clamp-3 px-2 text-center text-xs font-bold break-words text-white sm:text-sm">
						{colorNames[playerColor]}
					</p>
				</div>
				{isConnected && (
					<div className="rounded-lg bg-blue-50 px-4 py-2 text-center sm:px-6 sm:py-3">
						<p className="text-2xl font-bold text-blue-600 sm:text-3xl">
							{playerCount}
						</p>
						<p className="text-[10px] text-blue-700 sm:text-xs">
							{playerCount <= 1
								? config.justYouLabel
								: config.connectedWithCountMd.replace(
										'{count}',
										(playerCount - 1).toString()
									)}
						</p>
					</div>
				)}
			</div>

			{/* Instructions */}
			<div className="w-full max-w-xs text-center">
				<p className="text-xs text-slate-600 sm:text-sm">
					{config.colorSortingInstructionsMd}
				</p>
			</div>

			{/* QR Code section */}
			<div className="w-full max-w-xs space-y-2 rounded-xl bg-gradient-to-b from-slate-50 to-slate-100 p-4 shadow-sm sm:max-w-sm sm:p-5">
				<p className="text-center text-xs font-semibold text-slate-700">
					{config.shareYourCodeLabel}
				</p>
				<div className="flex justify-center rounded-lg bg-white p-3">
					<KmQrCode data={qrCodeUrl} size={150} />
				</div>
				<p className="text-center text-[11px] text-slate-500">
					{config.orientationLabel}
				</p>
			</div>

			{/* Scan button */}
			<button
				type="button"
				className="km-btn-primary h-11 w-full max-w-xs text-sm font-semibold sm:max-w-sm"
				onClick={() => setShowScanner(true)}
			>
				<Scan className="size-5" />
				{config.scanQrCodeButton}
			</button>

			{/* Feedback message */}
			{feedback && (
				<div
					className={`w-full max-w-xs rounded-lg p-2 text-center text-xs sm:max-w-sm sm:p-3 sm:text-sm ${
						feedbackType === 'success'
							? 'bg-green-100 text-green-900'
							: feedbackType === 'error'
								? 'bg-red-100 text-red-900'
								: 'bg-blue-100 text-blue-900'
					}`}
				>
					{feedback}
				</div>
			)}

			{/* QR Scanner modal */}
			{showScanner && (
				<QrScanner
					onScan={handleQrScan}
					onClose={() => setShowScanner(false)}
				/>
			)}
		</div>
	);
};

// Wrapper component that handles playerColor being undefined
export const ColorSortingView: React.FC = () => {
	const { playerColors, roundActive } = useSnapshot(globalStore.proxy);
	const playerColor = playerColors[kmClient.id];

	if (!playerColor || !roundActive) {
		return (
			<div className="flex h-full flex-col items-center justify-center">
				<p className="text-lg">{config.loading}</p>
			</div>
		);
	}

	return <ColorSortingViewInner key={playerColor} playerColor={playerColor} />;
};
