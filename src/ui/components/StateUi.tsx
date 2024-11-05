import type { app } from '@/global/states'
import type { AppStates } from '@/lib/app'
import { stateSignal } from '@/lib/signal'
import { type JSX, Show } from 'solid-js'

export function StateUi(props: { state: AppStates<typeof app>, children: JSX.Element, disabled?: boolean }) {
	const active = stateSignal(props.state)
	return (
		<Show when={active()}>
			{props.children}
		</Show>
	)
}