import type { JSX } from 'solid-js'
import type { app } from '@/global/states'
import type { AppStates } from '@/lib/app'
import { createMemo, Show } from 'solid-js'
import { stateSignal } from '@/lib/signal'

export function StateUi(props: { state: AppStates<typeof app>, children: JSX.Element, disabled?: boolean }) {
	const active = stateSignal(props.state)
	const show = createMemo(() => active() !== (props.disabled ?? false))
	return (
		<Show when={show()}>
			{props.children}
		</Show>
	)
}