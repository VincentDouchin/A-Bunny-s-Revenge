import { For } from 'solid-js'
import { Portal } from 'solid-js/web'
import { ecs, ui } from '@/global/init'

const dialogQuery = ecs.with('currentDialog', 'dialogContainer')
export const DialogUi = () => {
	const dialogs = ui.sync(() => [...dialogQuery])
	return (
		<For each={dialogs()}>
			{ (entity) => {
				const dialog = ui.sync(() => entity.currentDialog)

				return (
					<Portal mount={entity.dialogContainer.element}>
						<div style={{ 'color': 'white', 'font-family': 'NanoPlus', 'font-size': '2rem', 'background': 'hsl(0, 0%, 0%, 50%)', 'border-radius': '1rem', 'padding': '1rem' }}>{dialog()}</div>
					</Portal>
				)
			}}
		</For>
	)
}