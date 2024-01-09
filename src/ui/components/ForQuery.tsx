import type { Query } from 'miniplex'
import type { Accessor, JSX } from 'solid-js'
import { For } from 'solid-js'
import { ui } from '@/global/init'

export function ForQuery<T>(props: { query: Query<T>, children: (item: T) => JSX.Element }) {
	const querySynced = ui.sync(() => props.query.entities)
	return (
		<For each={querySynced()}>
			{(item) => {
				const itemSynced = ui.sync(() => item)
				return props.children(itemSynced())
			}}
		</For>
	)
}