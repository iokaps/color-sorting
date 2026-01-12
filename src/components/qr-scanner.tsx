import { BrowserMultiFormatReader } from '@zxing/browser';
import { X } from 'lucide-react';
import * as React from 'react';

interface QrScannerProps {
	onScan: (data: string) => void;
	onClose: () => void;
}

export const QrScanner: React.FC<QrScannerProps> = ({ onScan, onClose }) => {
	const videoRef = React.useRef<HTMLVideoElement>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [isScanning, setIsScanning] = React.useState(true);
	const codeReaderRef = React.useRef<BrowserMultiFormatReader | null>(null);
	const hasDetectedRef = React.useRef(false);
	const callbackRef = React.useRef(onScan);

	// Update callback ref when onScan changes
	React.useEffect(() => {
		callbackRef.current = onScan;
	}, [onScan]);

	// Request camera permission and start scanning
	React.useEffect(() => {
		const startScanning = async () => {
			try {
				const codeReader = new BrowserMultiFormatReader();
				codeReaderRef.current = codeReader;

				await codeReader.decodeFromVideoDevice(
					undefined, // use default camera
					videoRef.current!,
					(scanResult, err) => {
						// Skip if we've already detected a code
						if (hasDetectedRef.current) {
							return;
						}

						if (scanResult) {
							const text = scanResult.getText();

							// Mark that we detected a code and stop processing
							hasDetectedRef.current = true;
							setIsScanning(false);

							// Call the callback with the detected text
							callbackRef.current(text);
							return;
						}
						// Ignore errors - they just mean no QR found in frame
						if (err && err.name !== 'NotFoundException') {
							// Error logged but ignored
						}
					}
				);
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Failed to access camera';
				console.error('[QrScanner] Error starting scan:', message, err);
				setError(`Camera permission denied: ${message}`);
				setIsScanning(false);
			}
		};

		startScanning();

		return () => {
			// Cleanup - scanner resources released automatically
		};
	}, []);

	return (
		<div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4">
			<div className="w-full max-w-md space-y-4">
				{error ? (
					<div className="space-y-4 rounded-xl bg-white p-6 text-center">
						<p className="text-red-500">{error}</p>
						<button
							type="button"
							className="km-btn-primary w-full"
							onClick={onClose}
						>
							Close
						</button>
					</div>
				) : (
					<>
						<div className="relative overflow-hidden rounded-xl bg-black">
							<video
								ref={videoRef}
								className="w-full"
								autoPlay
								playsInline
								muted
							/>
							{isScanning && (
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="h-64 w-64 border-4 border-green-500 opacity-50" />
								</div>
							)}
						</div>

						<button
							type="button"
							className="absolute top-4 right-4 rounded-full bg-white p-2"
							onClick={onClose}
						>
							<X className="size-6 text-black" />
						</button>

						<p className="text-center text-white">
							{isScanning
								? 'Point your camera at a QR code'
								: 'QR code detected, processing...'}
						</p>
					</>
				)}
			</div>
		</div>
	);
};
