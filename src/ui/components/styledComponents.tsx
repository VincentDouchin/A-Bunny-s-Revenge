import type { icons } from '@assets/assets'
import type { JSX, JSXElement } from 'solid-js'
import { css } from 'solid-styled'
import { assets } from '@/global/init'

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

export const GoldContainer = (props: { children: JSXElement | JSXElement [], padding?: string }) => {
	css/* css */`
	.styled-container {
		box-shadow: inset 0px 0px 1rem 0px black;
		border: solid 0.3rem var(--gold);
		padding: ${props.padding ?? '2rem'};
		border-radius: 1rem;
		background: var(--brown-dark);
		transition: all 0.5s
	}
	`
	return <div class="styled-container">{props.children}</div>
}

export const Icon = (props: { icon: icons }) => {
	css/* css */`
	.icon{
	}
	`
	return <div class="icon" innerHTML={assets.icons[props.icon]}></div>
}
export const InventoryTitle = (props: { children: JSXElement, color?: string }) => {
	css/* css */`
	.inventory-title{
		font-size: 3rem;
		color: ${props.color ?? 'white'};
		font-family: NanoPlus;
		text-transform: capitalize;
	}	
	`
	return (
		<div class="inventory-title">
			<OutlineText>
				{props.children}
			</OutlineText>
		</div>
	)
}