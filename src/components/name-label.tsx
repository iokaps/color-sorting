import * as React from 'react';

interface NameLabelProps {
	name: string;
}

/**
 * A label component to display the player's name
 *
 * This example is **optional** and can be removed if not needed
 */
export const NameLabel: React.FC<NameLabelProps> = ({ name }) => {
	const initial = name.charAt(0).toUpperCase();

	return (
		<div className="flex items-center gap-2.5">
			<div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
				{initial}
			</div>
			<span className="text-sm font-semibold text-slate-700">{name}</span>
		</div>
	);
};
