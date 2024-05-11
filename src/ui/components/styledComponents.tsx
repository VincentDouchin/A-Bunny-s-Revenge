import type { JSX } from 'solid-js'
import { css } from 'solid-styled'

export const OutlineText = (props: { children: JSX.Element, size?: string }) => {
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
	return <div class="outline-text">{props.children}</div>
}