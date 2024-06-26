import type { JSX } from 'solid-js'
import { Show, createMemo, onCleanup } from 'solid-js'

import Cross from '@assets/icons/xmark-solid.svg'
import { css } from 'solid-styled'
import { Transition } from 'solid-transition-group'
import type { Atom } from 'solid-use/atom'
import atom from 'solid-use/atom'
import { useGame } from '../store'
import { save } from '@/global/save'

const CloseButton = () => {
	const context = useGame()
	const menuTouchController = createMemo(() => context?.player().menuInputs.touchController)
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
		bottom: 100%;
		right: 0;
		margin: 1rem;
		border-radius: 1rem;
		border: solid 0.1rem hsla(0, 0%, 100%, 0.3);
		font-size: 3rem;
		fill: white;
		display: grid;
		place-items: center;
	}
	`
	return (
		<Show when={context?.usingTouch() || save.settings.controls === 'mouse'}>
			<div
				class="close-button icon-container"
				onTouchStart={closeInventory}
				onTouchEnd={reset}
				onPointerDown={closeInventory}
				onPointerUp={reset}
			>
				<Cross />
			</div>
		</Show>
	)
}
export function Modal<T>(props: { children: JSX.Element, open: T, showClose?: boolean, finished?: Atom<boolean> }) {
	css/* css */`
	.modal{
		place-self: center;
		position:relative;

	}
	`
	const styleCache = atom<Node[]>([])
	const beforeEnter = (el: Element) => {
		const styles = document.querySelectorAll('[s\\:id]')
		for (const style of styles) {
			const childs = el.querySelector(`[s\\:${style.getAttribute('s:id')?.replace('-1', '')}]`)
			if (childs) {
				const clone = style.cloneNode(true)
				styleCache([...styleCache(), clone])
				document.head.appendChild(clone)
			}
		}
	}
	const afterExit = () => {
		props.finished && props.finished(true)
		for (const style of styleCache()) {
			style.parentNode?.removeChild(style)
		}
		styleCache([])
	}

	return (
		<Transition name="slide" onEnter={beforeEnter} onAfterExit={afterExit}>
			<Show when={props.open}>
				<div class="modal">
					{(props.showClose ?? true) && <CloseButton />}
					{props.children}
				</div>
			</Show>
		</Transition>
	)
}