import type { JSX, JSXElement } from 'solid-js'
import { css } from 'solid-styled'

interface OutlineTextProps {
	children: JSX.Element
	size?: string
}
export const OutlineText = (props: OutlineTextProps) => {
	css/* css */`
	.outline-text {
		line-height: 1.2;
		padding: var(--size);
		letter-spacing: calc(0.5 * var(--size));
		--size: ${props.size ?? '0.1em'};
		--size-minus: calc(-1 * var(--size));
		text-shadow:
			0 var(--size) black,
			var(--size) var(--size) black,
			var(--size) 0 black,
			0 var(--size-minus) black,
			var(--size-minus) var(--size-minus) black,
			var(--size-minus) var(--size) black,
			var(--size) var(--size-minus) black,
			var(--size-minus) 0 black;
	}
	`
	return <div class="outline-text" use:solid-styled>{props.children}</div>
}

export const GoldContainer = (props: { children: JSXElement | JSXElement [] }) => {
	css/* css */`
	.styled-container {
		box-shadow: inset 0px 0px 1rem 0px black;
		border: solid 0.3rem var(--gold);
		padding: 2rem;
		border-radius: 1rem;
		background: var(--brown-dark);
	}
	`
	return <div class="styled-container">{props.children}</div>
}