import type { app } from '@/global/states'
import type { AppStates } from '@/lib/app'
import { stateSignal } from '@/lib/signal'
import { createMemo, type JSX, Show } from 'solid-js'

export function StateUi(props: { state: AppStates<typeof app>, children: JSX.Element, disabled?: boolean }) {
	const active = stateSignal(props.state)
	const show = createMemo(() => active() !== (props.disabled ?? false))
	return (
		<Show when={show()}>
			{props.children}
		</Show>
	)
}