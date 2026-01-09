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
	const isScanningRef = React.useRef(true);
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
					(result, err) => {
						if (!isScanningRef.current) return;

						if (result) {
							isScanningRef.current = false;
							setIsScanning(false);
							callbackRef.current(result.getText());
						}
						// Ignore errors - they just mean no QR found in frame
						if (err && err.name !== 'NotFoundException') {
							console.warn('QR scan error:', err);
						}
					}
				);
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Failed to access camera';
				setError(`Camera permission denied: ${message}`);
				setIsScanning(false);
			}
		};

		startScanning();

		// Capture ref for cleanup
		const videoElement = videoRef.current;

		return () => {
			isScanningRef.current = false;
			// Stop the code reader and release camera
			if (codeReaderRef.current && videoElement?.srcObject) {
				const stream = videoElement.srcObject as MediaStream;
				stream.getTracks().forEach((track) => track.stop());
			}
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
