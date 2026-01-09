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
import Markdown from 'react-markdown';

const COLOR_CLASSES: Record<ColorName, string> = {
	red: 'bg-rose-600',
	blue: 'bg-blue-700',
	green: 'bg-emerald-600',
	yellow: 'bg-amber-600'
};

export const ColorSortingView: React.FC = () => {
	const { playerColors, roundActive, colorNames } = useSnapshot(
		globalStore.proxy
	);
	const playerColor = playerColors[kmClient.id];
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

	// Get faction data
	const factionState = useSnapshot(colorStore.proxy);
	const connectedCount = factionState?.connections
		? Object.keys(factionState.connections).length
		: 0;

	// Generate QR code URL with player's Kokimoki ID
	const qrCodeUrl = `${window.location.origin}/join?playerCode=${kmClient.id}`;

	const handleQrScan = async (scannedData: string) => {
		try {
			// Parse the scanned data to extract playerCode
			// Expected format: URL with ?playerCode=xxx or just the clientId
			let scannedClientId = scannedData;

			// If it's a URL, extract the playerCode parameter
			if (scannedData.includes('playerCode=')) {
				const url = new URL(scannedData);
				scannedClientId = url.searchParams.get('playerCode') || scannedData;
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
				setFeedback(`Connected! Group size: ${connectedCount + 1}`);
			}

			// Clear feedback after 2 seconds
			setTimeout(() => setFeedback(null), 2000);
		} catch {
			setFeedbackType('error');
			setFeedback('Failed to connect. Try again.');
			setTimeout(() => setFeedback(null), 2000);
		}

		setShowScanner(false);
	};

	if (!playerColor || !roundActive || !isConnected) {
		return (
			<div className="flex h-full flex-col items-center justify-center">
				<p className="text-lg">{config.loading}</p>
			</div>
		);
	}

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-4 overflow-y-auto px-3 py-4 sm:gap-6 sm:px-4 sm:py-6">
			{/* Color reference card */}
			<div
				className={`flex h-16 w-16 items-center justify-center rounded-xl shadow-lg sm:h-20 sm:w-20 sm:rounded-2xl ${COLOR_CLASSES[playerColor]}`}
			>
				<p className="text-xs font-bold text-white sm:text-sm">
					{colorNames[playerColor]}
				</p>
			</div>

			{/* Group size display */}
			{isConnected && (
				<div className="rounded-lg bg-blue-50 p-4 text-center sm:rounded-xl sm:p-6">
					<p className="text-3xl font-bold text-blue-600 sm:text-4xl">
						{connectedCount + 1}
					</p>
					<p className="text-xs text-blue-700 sm:text-sm">
						{connectedCount === 0
							? 'Just you'
							: config.connectedWithCountMd.replace(
									'{count}',
									connectedCount.toString()
								)}
					</p>
				</div>
			)}

			{/* Instructions */}
			<div className="prose prose-sm sm:prose w-full max-w-sm text-center">
				<Markdown>{config.colorSortingInstructionsMd}</Markdown>
			</div>

			{/* QR Code section */}
			<div className="w-full max-w-xs space-y-3 rounded-lg bg-slate-50 p-4 sm:max-w-sm sm:space-y-4 sm:rounded-xl sm:p-6">
				<p className="text-center text-xs font-medium text-slate-600 sm:text-sm">
					Others scan this code
				</p>
				<div className="flex justify-center">
					<KmQrCode data={qrCodeUrl} size={160} />
				</div>
			</div>

			{/* Scan button */}
			<button
				type="button"
				className="km-btn-primary h-12 w-full max-w-xs sm:max-w-sm"
				onClick={() => setShowScanner(true)}
			>
				<Scan className="size-5" />
				{config.scanQrCodeButton}
			</button>

			{/* Feedback message */}
			{feedback && (
				<div
					className={`w-full max-w-xs rounded-lg p-3 text-center text-sm sm:max-w-sm sm:rounded-xl sm:p-4 ${
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
