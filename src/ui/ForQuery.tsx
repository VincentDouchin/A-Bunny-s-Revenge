import type { Query } from 'miniplex'
import type { JSX } from 'solid-js'
import { For } from 'solid-js'
import { ui } from '@/global/init'

export function ForQuery<T>(props: { query: Query<T>; children: (item: T) => JSX.Element }) {
	const querySynced = ui.sync(() => [...props.query])
	return (
		<For each={querySynced()}>
			{item => props.children(item)}
		</For>
	)
}