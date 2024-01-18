import type { JSXElement } from 'solid-js'
import { Show, createMemo, onCleanup } from 'solid-js'

import xmark from '@assets/icons/xmark-solid.svg?raw'
import { Transition } from 'solid-transition-group'
import { ecs, inputManager, ui } from '@/global/init'

const menuQuery = ecs.with('menuOpen', 'menuInputs')
const CloseButton = () => {
	const controls = ui.sync(() => inputManager.controls)
	const isTouch = createMemo(() => controls() === 'touch')
	const menuTouchController = ui.sync(() => menuQuery.first?.menuInputs.touchController)
	const closeInventory = () => {
		menuTouchController()?.set('cancel', 1)
	}
	const reset = () => {
		menuTouchController()?.set('cancel', 0)
	}
	onCleanup(reset)

	return (
		<Show when={isTouch()}>
			<div style={{ 'width': '4rem', 'height': '4rem', 'background': 'hsl(0,0%,0%, 20%)', 'position': 'absolute', 'top': '0', 'right': '0', 'margin': '1rem', 'border-radius': '1rem', 'border': `solid 0.1rem hsl(0, 0%,100%, 30% )`, 'font-size': '3rem', 'color': 'white', 'display': 'grid', 'place-items': 'center' }} innerHTML={xmark} class="icon-container" onTouchStart={closeInventory} onTouchEnd={reset}></div>
		</Show>
	)
}

export function Modal<T>(props: { children: JSXElement, open: T, showClose?: boolean }) {
	return (
		<Transition name="slide">
			<Show when={props.open}>
				<div style={{ 'background': 'hsla(0 0% 0% / 50%)', 'place-self': 'center', 'padding': '2rem', 'border-radius': '1rem', 'display': 'grid', 'gap': '2rem', 'position': 'relative' }}>
					{(props.showClose ?? true) && <CloseButton />}
					{props.children}
				</div>
			</Show>
		</Transition>
	)
}