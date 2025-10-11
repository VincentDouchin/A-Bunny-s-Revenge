import type { JSX } from 'solid-js'
import type { Atom } from 'solid-use/atom'
import Cross from '@assets/icons/xmark-solid.svg'
import { createMemo, onCleanup, Show } from 'solid-js'
import { css } from 'solid-styled'
import { Transition } from 'solid-transition-group'
import atom from 'solid-use/atom'
import { settings } from '@/global/init'
import { useGame } from '../store'
import { GoldContainer } from './styledComponents'

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
		position: absolute;
		top: 0%;
		right: 0%;
		margin: 1rem;
		font-size: 3rem;
		fill: white;
		z-index: 1;
		line-height: 1;
	}
	`
	return (
		<Show when={context?.usingTouch() || settings.controls === 'mouse'}>

			<div
				class="close-button icon-container"
				onTouchStart={closeInventory}
				onTouchEnd={reset}
				onPointerDown={closeInventory}
				onPointerUp={reset}
			>
				<GoldContainer padding="0.5rem">
					<Cross />
				</GoldContainer>
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