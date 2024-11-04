import type { AppStates } from '@/lib/app'
import { ui } from '@/global/init'
import { app } from '@/global/states'
import { type JSX, Show } from 'solid-js'

export function StateUi(props: { state: AppStates<typeof app>, children: JSX.Element, disabled?: boolean }) {
	const active = ui.sync(() => app.isEnabled(props.state))
	return (
		<Show when={active()}>
			{props.children}
		</Show>
	)
}