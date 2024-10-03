import CaretRight from '@assets/icons/caret-right-solid.svg'
import type { Accessor } from 'solid-js'
import { Portal } from 'solid-js/web'
import { css } from 'solid-styled'

export const MovingArrows = (props: { mount: Accessor<HTMLElement | undefined> }) => {
	css/* css */`
	.left{
		position: absolute;
		left: 0px;
		top: 50%;
		translate: -1.2em -50%;
		font-size: 2em;
		fill: white;
	}
	:global(.left svg){
		stroke: black;
		stroke-width: 15%;
	}
	`
	return (
		<Portal mount={props.mount()}>
			<div class="left"><CaretRight /></div>
		</Portal>
	)
}