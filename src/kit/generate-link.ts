// IMPORTANT: Do NOT modify or remove this file
import { kmEnv } from '@/services/km-client';
import type { ClientContext } from '@/types';

/**
 * Generate a link for Kokimoki app to access via link or QR code
 * @param code Kokimoki app code
 * @param fallbackContext Context ONLY used in dev mode
 * @returns Generated link URL
 */
export function generateLink(code: string, fallbackContext: ClientContext) {
	if (kmEnv.dev) {
		return `${window.location.origin}?key=${code}&context=${btoa(JSON.stringify(fallbackContext))}`;
	}

	return `${window.location.origin}/${code}`;
}
