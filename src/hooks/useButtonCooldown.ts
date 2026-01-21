import { useCallback, useEffect, useState } from 'react';

/**
 * Hook to manage button cooldown state to prevent double-clicks
 * @param ms - Cooldown duration in milliseconds (default: 1000ms)
 * @returns [isCoolingDown, startCooldown] - State and trigger function
 */
export function useButtonCooldown(
	ms = 1000
): [boolean, () => void, () => void] {
	const [isCoolingDown, setIsCoolingDown] = useState(false);

	useEffect(() => {
		if (!isCoolingDown) return;

		const timeout = setTimeout(() => {
			setIsCoolingDown(false);
		}, ms);

		return () => clearTimeout(timeout);
	}, [isCoolingDown, ms]);

	const startCooldown = useCallback(() => {
		setIsCoolingDown(true);
	}, []);

	const resetCooldown = useCallback(() => {
		setIsCoolingDown(false);
	}, []);

	return [isCoolingDown, startCooldown, resetCooldown];
}
