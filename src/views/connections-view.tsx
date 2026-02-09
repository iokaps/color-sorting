import { config } from '@/config';
import { usePlayersWithStatus } from '@/hooks/usePlayersWithStatus';
import { kmClient } from '@/services/km-client';
import { cn } from '@/utils/cn';
import React from 'react';
import Markdown from 'react-markdown';

interface Props {
	className?: string;
}

/**
 * View to display players who have joined the game and their online status.
 *
 * This example is **optional** and can be removed if not needed
 */
export const ConnectionsView: React.FC<React.PropsWithChildren<Props>> = ({
	children
}) => {
	const { players } = usePlayersWithStatus();
	const onlinePlayersCount = players.filter((p) => p.isOnline).length;

	const isPresenter = kmClient.clientContext.mode === 'presenter';

	return (
		<div className="w-full space-y-8">
			<div className="flex items-center justify-between gap-8">
				<article
					className={cn(
						'prose',
						isPresenter && 'lg:prose-lg xl:prose-xl 2xl:prose-2xl'
					)}
				>
					<h1>
						{onlinePlayersCount} {config.players}
					</h1>

					<Markdown>{config.connectionsMd}</Markdown>
				</article>

				{children}
			</div>

			{players.length > 0 && (
				<ul className="w-full space-y-1 lg:text-lg xl:text-xl 2xl:text-2xl">
					{players.map((player) => (
						<li
							key={player.id}
							className="rounded-xl px-3 py-4 transition-colors hover:bg-white/50"
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div
										className={cn(
											'size-2.5 rounded-full shadow-sm',
											player.isOnline
												? 'bg-green-400 shadow-green-400/50'
												: 'bg-slate-300'
										)}
									/>
									<span className="font-semibold">{player.name}</span>
								</div>
								<span
									className={cn(
										'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
										player.isOnline
											? 'bg-green-50 text-green-700 ring-1 ring-green-200/80'
											: 'text-slate-400 italic'
									)}
								>
									{player.isOnline ? config.online : config.offline}
								</span>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};
