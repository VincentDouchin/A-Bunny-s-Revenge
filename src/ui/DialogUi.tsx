import { For, createEffect, createSignal, onCleanup } from 'solid-js'
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
						<div style={{ 'color': 'white', 'font-family': 'NanoPlus', 'font-size': '2rem', 'background': 'hsl(0, 0%, 0%, 50%)', 'border-radius': '1rem', 'padding': '1rem', 'display': 'flex' }}><DialogText text={dialog() as string} /></div>
					</Portal>
				)
			}}
		</For>
	)
}