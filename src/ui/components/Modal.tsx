import type { JSXElement } from 'solid-js'
import { Show, createMemo, onCleanup } from 'solid-js'

import { Transition } from 'solid-transition-group'
import { css } from 'solid-styled'
import { assets, ecs, inputManager, ui } from '@/global/init'

const playercontrolsQuery = ecs.with('player', 'menuInputs')
const CloseButton = () => {
	const controls = ui.sync(() => inputManager.controls)
	const isTouch = createMemo(() => controls() === 'touch')
	const menuTouchController = ui.sync(() => playercontrolsQuery.first?.menuInputs.touchController)
	const closeInventory = () => {
		menuTouchController()?.set('cancel', 1)
	}
	const reset = () => {
		menuTouchController()?.set('cancel', 0)
	}
	onCleanup(reset)
	css/* CSS */`
	.close-button{
		width: 4rem;
		height: 4rem;
		background: hsla(0, 0%, 0%, 0.2);
		position: absolute;
		top: 0;
		right: 0;
		margin: 1rem;
		border-radius: 1rem;
		border: solid 0.1rem hsla(0, 0%, 100%, 0.3);
		font-size: 3rem;
		color: white;
		display: grid;
		place-items: center;
	}
	`
	return (
		<Show when={isTouch()}>
			<div
				class="close-button icon-container"
				innerHTML={assets.icons['xmark-solid']}
				onTouchStart={closeInventory}
				onTouchEnd={reset}
			/>
		</Show>
	)
}

export function Modal<T>(props: { children: JSXElement, open: T, showClose?: boolean }) {
	css/* css */`
	.modal{
		
		place-self: center;
		padding: 2rem;
		border-radius: 1rem;
		display: grid;
		gap: 2rem;
		position: relative;
		
	}
	`
	return (
		<Transition name="slide">
			<Show when={props.open}>
				<div class="modal styled-container">
					{(props.showClose ?? true) && <CloseButton />}
					{props.children}
				</div>
			</Show>
		</Transition>
	)
}