import { QrScanner } from '@/components/qr-scanner';
import { config } from '@/config';
import { useDynamicStore } from '@/hooks/useDynamicStore';
import { kmClient } from '@/services/km-client';
import { colorActions } from '@/state/actions/color-actions';
import {
	createColorFactionState,
	getColorStoreName
} from '@/state/stores/color-store';
import { globalStore, type ColorName } from '@/state/stores/global-store';
import { useSnapshot } from '@kokimoki/app';
import { KmQrCode } from '@kokimoki/shared';
import { Scan } from 'lucide-react';
import * as React from 'react';

const COLOR_CLASSES: Record<ColorName, string> = {
	red: 'bg-rose-600',
	blue: 'bg-blue-700',
	green: 'bg-emerald-600',
	yellow: 'bg-amber-600'
};

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

	// Get faction data - use players count from centralized store
	const factionState = useSnapshot(colorStore.proxy);
	const playerCount = factionState?.players
		? Object.keys(factionState.players).length
		: 0;

	// Auto-register player in their color faction when connected
	React.useEffect(() => {
		if (isConnected) {
			colorActions.registerPlayer(colorStore).catch(console.error);
		}
	}, [isConnected, colorStore]);

	// Generate QR code URL with player's Kokimoki ID AND color
	const qrCodeUrl = `${window.location.origin}/join?playerCode=${kmClient.id}&color=${playerColor}`;

	const handleQrScan = async (scannedData: string) => {
		try {
			// Parse the scanned data to extract playerCode and color
			let scannedClientId = scannedData;
			let scannedColor: string | null = null;

			// If it's a URL, extract the parameters
			if (scannedData.includes('playerCode=')) {
				const url = new URL(scannedData);
				scannedClientId = url.searchParams.get('playerCode') || scannedData;
				scannedColor = url.searchParams.get('color');
			}

			// Validate: both players must have the same color
			if (scannedColor && scannedColor !== playerColor) {
				setFeedbackType('error');
				setFeedback(
					`Wrong color! They are ${colorNames[scannedColor as ColorName] || scannedColor}, you are ${colorNames[playerColor]}`
				);
				setTimeout(() => setFeedback(null), 3000);
				setShowScanner(false);
				return;
			}

			// Don't connect to yourself
			if (scannedClientId === kmClient.id) {
				setFeedbackType('info');
				setFeedback("That's your own QR code!");
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
				setFeedback(`Connected! Group size: ${playerCount + 1}`);
			}

			// Clear feedback after 2 seconds
			setTimeout(() => setFeedback(null), 2000);
		} catch (err) {
			console.error('QR scan error:', err);
			setFeedbackType('error');
			setFeedback('Failed to connect. Try again.');
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
					className={`flex h-12 w-12 items-center justify-center rounded-lg shadow-md sm:h-14 sm:w-14 sm:rounded-xl ${COLOR_CLASSES[playerColor]}`}
				>
					<p className="text-[10px] font-bold text-white sm:text-xs">
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
								? 'Just you'
								: config.connectedWithCountMd.replace(
										'{count}',
										(playerCount - 1).toString()
									)}
						</p>
					</div>
				)}
			</div>

			{/* QR Code section */}
			<div className="w-full max-w-xs space-y-1 rounded-lg bg-slate-50 p-3 sm:max-w-sm sm:space-y-2 sm:p-4">
				<p className="text-center text-[10px] font-medium text-slate-600 sm:text-xs">
					Others scan this code
				</p>
				<div className="flex justify-center">
					<KmQrCode data={qrCodeUrl} size={140} />
				</div>
			</div>

			{/* Scan button */}
			<button
				type="button"
				className="km-btn-primary h-10 w-full max-w-xs text-sm sm:h-11 sm:max-w-sm"
				onClick={() => setShowScanner(true)}
			>
				<Scan className="size-4" />
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

	return <ColorSortingViewInner playerColor={playerColor} />;
};
