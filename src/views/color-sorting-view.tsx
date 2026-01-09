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
	red: 'bg-red-500',
	blue: 'bg-blue-500',
	green: 'bg-green-500',
	yellow: 'bg-yellow-400'
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
	const connectedCount = Object.keys(factionState.connections).length;

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

	if (!playerColor || !roundActive) {
		return (
			<div className="flex h-full flex-col items-center justify-center">
				<p className="text-lg">{config.loading}</p>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col items-center justify-center space-y-6 p-4">
			{/* Color reference card */}
			<div
				className={`flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg ${COLOR_CLASSES[playerColor]}`}
			>
				<p className="text-sm font-bold text-white">
					{colorNames[playerColor]}
				</p>
			</div>

			{/* Group size display */}
			{isConnected && (
				<div className="rounded-xl bg-blue-50 p-6 text-center">
					<p className="text-4xl font-bold text-blue-600">
						{connectedCount + 1}
					</p>
					<p className="text-sm text-blue-700">
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
			<div className="prose text-center">
				<Markdown>{config.colorSortingInstructionsMd}</Markdown>
			</div>

			{/* QR Code section */}
			<div className="space-y-4 rounded-xl bg-slate-50 p-6">
				<p className="text-center text-sm font-medium text-slate-600">
					Others scan this code
				</p>
				<div className="flex justify-center">
					<KmQrCode data={qrCodeUrl} size={200} />
				</div>
			</div>

			{/* Scan button */}
			<button
				type="button"
				className="km-btn-primary"
				onClick={() => setShowScanner(true)}
			>
				<Scan className="size-5" />
				{config.scanQrCodeButton}
			</button>

			{/* Feedback message */}
			{feedback && (
				<div
					className={`rounded-xl p-4 text-center ${
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
