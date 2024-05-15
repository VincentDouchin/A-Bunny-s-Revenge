import type { Accessor, Component, JSX } from 'solid-js'
import { createEffect, createRoot, createSignal, onCleanup } from 'solid-js'

import type { Atom } from 'solid-use/atom'
import { generateUUID } from 'three/src/math/MathUtils'
import { ui } from '@/global/init'
import type { MenuInputMap } from '@/global/inputMaps'
import { playSound } from '@/global/sounds'

const findClosest = (selected: HTMLElement, neighbors: IterableIterator<HTMLElement>) => (direction: 'up' | 'down' | 'left' | 'right') => {
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
export interface MenuItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
	menu: MenuDir
}

export type MenuItem = (el: HTMLElement, selected: () => [MenuDir, boolean, Atom<boolean>]) => void
declare module 'solid-js' {
	// eslint-disable-next-line ts/no-namespace
	namespace JSX {
		interface DirectiveFunctions { // use:model
			menuItem: MenuItem
		}
	}
}

export interface MenuDir {
	refs: Map<string, HTMLElement>
	inverseRefs: Map<HTMLElement, string>
	setSelected: (id: string) => void
	selected: Accessor<string>
}
export const menuItem: MenuItem = (el, init) => {
	const id = generateUUID()
	const [menu, first, isSelected] = init()
	if (first) {
		menu.setSelected(id)
	}
	onCleanup(() => {
		menu.refs.delete(id)
		menu.inverseRefs.delete(el)
	})
	menu.refs.set(id, el)
	menu.inverseRefs.set(el, id)

	const clickListener = () => {
		menu.setSelected(id)
	}
	el.addEventListener('pointerdown', clickListener)
	onCleanup(() => {
		el.removeEventListener('click', clickListener)
	})
	createEffect(() => {
		isSelected(id === menu.selected())
	})
}

export function Menu(props: { children: Component<MenuItemProps>, inputs?: MenuInputMap }) {
	const [selected, setSelected] = createSignal('')

	const refs = new Map<string, HTMLElement>()
	const inverseRefs = new Map<HTMLElement, string>()

	const update = () => {
		for (const direction of ['up', 'down', 'left', 'right'] as const) {
			if (props.inputs?.get(direction).justPressed) {
				const selectedId = createRoot(selected)
				const selectedElement = refs.get(selectedId)
				if (selectedElement) {
					const finder = findClosest(selectedElement, refs.values())
					const newSelectedElement = finder(direction)
					if (newSelectedElement) {
						const newSelected = inverseRefs.get(newSelectedElement)
						if (newSelected !== undefined) {
							setSelected(() => newSelected)
							playSound('004_Hover_04')
						}
					}
				}
			}
		}
		if (props.inputs?.get('validate').justPressed) {
			const selectedElement = refs.get(selected())
			if (selectedElement) {
				selectedElement.click()
			}
		}
	}
	ui.updateSync(update)
	const menu: MenuDir = { refs, inverseRefs, setSelected, selected }

	return (

		<props.children
			menu={menu}
		/>
	)
}
