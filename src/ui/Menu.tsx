import type { Accessor, Component } from 'solid-js'
import { createEffect, createMemo, createRoot, createSignal } from 'solid-js'

import { generateUUID } from 'three/src/math/MathUtils'
import { ui } from '@/global/init'
import type { MenuInputMap } from '@/lib/inputs'

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
interface MenuProps {
	children: Component<MenuItemProps>
	inputs?: MenuInputMap
}
export interface MenuItemProps {
	getProps: (first?: boolean) => {
		ref: (el: HTMLElement) => void
		onMouseEnter: () => void
		selected: Accessor<boolean>
	}
}
export function Menu(props: MenuProps) {
	const [selected, setSelected] = createSignal('')

	const refs = new Map<string, HTMLElement>()
	const inverseRefs = new Map<HTMLElement, string>()

	const inputs = ui.sync(() => props.inputs)
	createEffect(() => {
		for (const direction of ['up', 'down', 'left', 'right'] as const) {
			if (inputs()?.get(direction).justPressed) {
				const selectedId = createRoot(selected)
				const selectedElement = refs.get(selectedId)
				if (selectedElement) {
					const finder = findClosest(selectedElement, refs.values())
					const newSelectedElement = finder(direction)
					if (newSelectedElement) {
						const newSelected = inverseRefs.get(newSelectedElement)
						if (newSelected !== undefined) {
							setSelected(() => newSelected)
						}
					}
				}
			}
		}
	})
	createEffect(() => {
		if (inputs()?.get('validate').justPressed) {
			const selectedElement = refs.get(selected())
			if (selectedElement) {
				selectedElement.click()
			}
		}
	})
	const getProps = (first = false) => {
		const id = generateUUID()
		if (first) {
			setSelected(id)
		}
		const isSelected = createMemo(() => id === selected())
		return {
			ref: (el: HTMLElement) => { refs.set(id, el); inverseRefs.set(el, id) },
			onMouseEnter: () => setSelected(() => id),
			selected: isSelected,
		}
	}
	return <props.children getProps={getProps}></props.children>
}
