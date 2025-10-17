import type { Accessor, JSX } from 'solid-js'
import CaretRight from '@assets/icons/caret-right-solid.svg'
import { createEffect, createMemo, onCleanup, onMount, Show } from 'solid-js'
import { Portal } from 'solid-js/web'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'

import { menuInputs, ui } from '@/global/init'

const findClosest = (selected: HTMLElement, neighbors: Set<HTMLElement>) => (direction: 'up' | 'down' | 'left' | 'right') => {
	let distance = Number.POSITIVE_INFINITY
	let closest: HTMLElement | null = null
	const selectedRect = selected.getBoundingClientRect()
	let elementX = selectedRect.x + selectedRect.width / 2
	let elementY = selectedRect.y + selectedRect.height / 2
	if (direction === 'left') {
		elementX -= selectedRect.width / 2
	} else if (direction === 'right') {
		elementX += selectedRect.width / 2
	} else if (direction === 'up') {
		elementY -= selectedRect.height / 2
	} else if (direction === 'down') {
		elementY += selectedRect.height / 2
	}
	for (const neighbor of neighbors) {
		if (neighbor !== selected) {
			const dim = neighbor.getBoundingClientRect()
			const neighborX = dim.x + dim.width / 2
			const neighborY = dim.y + dim.height / 2
			const distanceToNeighbor = (elementX - neighborX) ** 2 + (elementY - neighborY) ** 2
			if (distance > distanceToNeighbor) {
				let isInDirection = false
				if (direction === 'down') {
					isInDirection = elementY < neighborY
				} else if (direction === 'up') {
					isInDirection = elementY > neighborY
				} else if (direction === 'right') {
					isInDirection = elementX < neighborX
				} else if (direction === 'left') {
					isInDirection = elementX > neighborX
				}
				if (isInDirection) {
					distance = distanceToNeighbor
					closest = neighbor
				}
			}
		}
	}
	return closest
}

interface MenuProps {
	children: (fn: (itemProps: MenuItemProps2) => JSX.Element) => JSX.Element
	showArrow?: boolean
}

export type MenuItemComponent = (props: MenuItemProps2) => JSX.Element

export interface MenuItemProps2 {
	children: (props: MenuItemChildrenProps) => JSX.Element
	defaultSelected?: boolean
	onClick?: () => void
	onLeft?: () => void
	onRight?: () => void
	onUp?: () => void
	onDown?: () => void
	onSelected?: () => void
}
export interface MenuItemChildrenProps {
	selected: Accessor<boolean>
	trigger: () => void
}

export function Menu({ children, showArrow = false }: MenuProps) {
	const selected = atom<HTMLElement | null>(null)
	const items = new Set<HTMLElement>()
	const callbacks = {
		right: new Map<HTMLElement, () => void>(),
		left: new Map<HTMLElement, () => void>(),
		up: new Map<HTMLElement, () => void>(),
		down: new Map<HTMLElement, () => void>(),
		selected: new Map<HTMLElement, () => void>(),
	}
	onCleanup(() => {
		items.clear()
		selected(null)
		Object.values(callbacks).forEach(callback => callback.clear())
	})
	createEffect(() => {
		const el = selected()
		if (el) {
			const callback = callbacks.selected.get(el)
			callback && callback()
		}
	})

	ui.updateSync(() => {
		const el = selected()
		if (!el) return
		const finder = findClosest(el, items)
		for (const direction of ['up', 'down', 'left', 'right'] as const) {
			if (menuInputs?.get(direction).justPressed) {
				const callback = callbacks[direction].get(el)
				if (callback) {
					callback()
				} else {
					const closest = finder(direction)
					if (closest) {
						selected(closest)
					}
				}
			}
		}
		if (menuInputs.get('validate').justPressed) {
			selected()?.click()
		}
	})

	const MenuItem = ({ children, defaultSelected, onClick, onLeft, onRight, onDown, onUp, onSelected }: MenuItemProps2) => {
		const self = atom<HTMLElement | null>(null)
		const isSelected = createMemo(() => selected() === self())
		onMount(() => {
			const selfValue = self()
			if (!selfValue) return
			items.add(selfValue)
			if (defaultSelected) {
				selected(selfValue)
			}
			if (onLeft) callbacks.left.set(selfValue, onLeft)
			if (onRight) callbacks.right.set(selfValue, onRight)
			if (onUp) callbacks.up.set(selfValue, onUp)
			if (onDown) callbacks.down.set(selfValue, onDown)
			if (onSelected) callbacks.down.set(selfValue, onSelected)
			onCleanup(() => {
				const selfValue = self()
				if (!selfValue) return
				items.delete(selfValue)
				callbacks.left.delete(selfValue)
				callbacks.right.delete(selfValue)
				callbacks.up.delete(selfValue)
				callbacks.down.delete(selfValue)
			})
		})
		const click = () => {
			const selfValue = self()
			if (!selfValue) return
			if (isSelected()) {
				onClick && onClick()
			} else {
				selected(selfValue)
			}
		}
		const trigger = () => selected(self())
		return (
			<div style="position: relative" ref={el => self(el)} onClick={click} onMouseEnter={() => selected(self())}>
				{children({ selected: isSelected, trigger })}
			</div>
		)
	}
	css/* css */`
	.arrow-container{
		position: fixed;
		inset: 0;
		pointer-events: none;
	}
	.arrow{
		position: absolute;
		left: 0px;
		top: 50%;
		translate: -1.2em -50%;
		font-size: 2em;
		fill: white;
	}
	:global(.arrow svg){
		stroke: black;
		stroke-width: 15%;
	}
	`
	return (
		<>
			<Show when={showArrow && selected()}>
				{selected => (
					<Portal mount={selected()}>
						<div class="arrow"><CaretRight /></div>
					</Portal>
				)}
			</Show>
			{children(MenuItem)}
		</>
	)
}