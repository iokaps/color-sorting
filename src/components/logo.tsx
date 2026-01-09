import { config } from '@/config';
import { cn } from '@/utils/cn';
import * as React from 'react';

/**
 *
 * This example is **optional** and can be removed if not needed
 */
export const Logo: React.FC<{ className?: string }> = ({ className }) => (
	<img
		src="https://static.kokimoki.com/gfc/v2/logo.svg"
		alt={config.title}
		title={config.title}
		className={cn('h-9', className)}
	/>
);
