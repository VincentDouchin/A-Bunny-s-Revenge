import { type JSX, Show } from 'solid-js'
import { ui } from '@/global/init'
import type { State } from '@/lib/state'

export function StateUi<T>(props: { state: State<T>; children: JSX.Element }) {
	const active = ui.sync(() => props.state.enabled)
	return (
		<Show when={active()}>
			{props.children}
		</Show>
	)
}