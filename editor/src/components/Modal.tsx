import type { JSX } from 'solid-js'
import type { Atom } from 'solid-use/atom'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import Fa from 'solid-fa'
import { Show } from 'solid-js'
import { Portal } from 'solid-js/web'
import { css } from 'solid-styled'

export function Modal(props: {
	children: JSX.Element
	open: Atom<boolean>
	trigger: JSX.Element
	title?: string
	closable?: boolean
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
		z-index: 5;
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
	.close-button{
		position: absolute;
		font-size: 1.2rem;
		top: 0.5rem;
		right: 1rem;
		color: grey;
		cursor: pointer;
	}
	.close-button:hover{
		color: white;
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
							<Show when={props.closable}>
								<div class="close-button" onClick={() => props.open(false)}>
									<Fa icon={faXmark}></Fa>
								</div>
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