import { For, Show, createEffect, createSignal, onCleanup } from 'solid-js'
import { Portal } from 'solid-js/web'
import { params } from '@/global/context'
import { ecs, ui } from '@/global/init'

export const DialogText = (props: { text: string }) => {
	let now = Date.now()
	const [time, setTime] = createSignal(0)
	const cleanUpTimeout = setInterval(() => {
		setTime(Math.floor((Date.now() - now) / 20 * params.dialogSpeed))
	})
	createEffect((val) => {
		if (props.text !== val) {
			setTime(0)
			now = Date.now()
		}
		return props.text
	})
	onCleanup(() => clearInterval(cleanUpTimeout))

	return (
		<For each={props.text.split('')}>
			{(ch, i) => {
				return <div class={`${time() >= i() ? 'letter-visible' : 'letter-hidden'} letter ${ch === ' ' ? 'space' : ''}`}>{ch}</div>
			}}
		</For>
	)
}

const dialogQuery = ecs.with('currentDialog', 'dialogContainer')
export const DialogUi = () => {
	const dialogs = ui.sync(() => [...dialogQuery])
	return (
		<For each={dialogs()}>
			{ (entity) => {
				const dialog = ui.sync(() => entity.currentDialog)

				return (
					<Portal mount={entity.dialogContainer.element}>
						<Show when={entity.npcName}>
							<div style={{ 'color': 'white', 'position': 'absolute', 'translate': '1rem -50%', 'font-family': 'NanoPlus', 'font-size': '1.5rem' }}>{entity.npcName}</div>
						</Show>
						<div class="dialog-container"><DialogText text={dialog() as string} /></div>
					</Portal>
				)
			}}
		</For>
	)
}