import type { State } from '@/lib/state'
import { ui } from '@/global/init'
import { type JSX, Show } from 'solid-js'

export function StateUi<T>(props: { state: State<T>, children: JSX.Element, disabled?: boolean }) {
	const active = ui.sync(() => props.state[props.disabled ? 'disabled' : 'enabled'])
	return (
		<Show when={active()}>
			{props.children}
		</Show>
	)
}