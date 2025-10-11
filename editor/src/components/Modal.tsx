import type { JSX } from 'solid-js'
import type { Atom } from 'solid-use/atom'
import { Show } from 'solid-js'
import { Portal } from 'solid-js/web'
import { css } from 'solid-styled'

export function Modal(props: {
	children: JSX.Element
	open: Atom<boolean>
	trigger: JSX.Element
	title?: string
}) {
	css/* css */`
	.modal-container{
		position: fixed;
		margin: auto;
		inset: 0;
		pointer-events: none;
		height: 100%;
		display: grid;
		place-items:center;
	}
	.modal{
		margin: auto;
		z-index: 1;
		pointer-events: all;
		background: var(--color-1);
		position: relative;
	}
	.modal-content{
		display: grid;
		gap: 2rem;
		padding: 2rem;
	}
	`
	return (
		<>
			{props.trigger}
			<Show when={props.open()}>
				<Portal mount={document.body}>
					<div class="modal-container">
						<section class="modal">
							<Show when={props.title}>
								<div class="title">{props.title}</div>
							</Show>
							<div class="modal-content">
								{props.children}
							</div>
						</section>
					</div>
				</Portal>
			</Show>
		</>
	)
}