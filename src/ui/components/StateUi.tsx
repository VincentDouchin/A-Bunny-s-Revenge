import type { JSX } from 'solid-js'
import type { app } from '@/global/states'
import type { AppStates, Resources } from '@/lib/app'
import { createMemo, Show } from 'solid-js'
import { stateSignal } from '@/lib/signal'

export function StateUi<S extends AppStates<typeof app>>(props: { state: S; children: (resources: Resources<typeof app, S>) => JSX.Element; disabled?: boolean }) {
	const [active, resources] = stateSignal(props.state)
	const show = createMemo(() => active() !== (props.disabled ?? false))
	return <Show when={show()}>{props.children(resources()!)}</Show>
}
