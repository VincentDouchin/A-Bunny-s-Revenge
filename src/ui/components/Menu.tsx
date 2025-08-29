import type { Accessor, Component, JSX } from 'solid-js'
import type { Atom } from 'solid-use/atom'
import { ui } from '@/global/init'
import { playSound } from '@/global/sounds'
import { createEffect, createMemo, createRoot, createSignal, onCleanup } from 'solid-js'
import { generateUUID } from 'three/src/math/MathUtils'

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

export type MenuItem = (el: HTMLElement, selected: () => [MenuDir, boolean, Atom<boolean>, Accessor<('up' | 'down' | 'left' | 'right')[]>, boolean ] | [MenuDir, boolean, Atom<boolean>]) => void
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
	selectedRef: Accessor<HTMLElement | undefined>
	setSelected: (id: string) => void
	setSelectedRef: (el: HTMLElement) => void
	selected: Accessor<string>
	disabledDirections: Map<string, Accessor<('up' | 'down' | 'left' | 'right')[]>>
}
export const menuItem: MenuItem = (el, init) => {
	const id = generateUUID()
	const [menu, first, isSelected, disabledDirections, autofocus] = init()
	if (first) {
		menu.setSelected(id)
	}
	if (disabledDirections) {
		menu.disabledDirections.set(id, disabledDirections)
	}
	menu.refs.set(id, el)
	menu.inverseRefs.set(el, id)

	const clickListener = () => {
		menu.setSelected(id)
	}
	el.addEventListener('pointerdown', clickListener)
	onCleanup(() => {
		el.removeEventListener('pointerdown', clickListener)
		menu.refs.delete(id)
		menu.inverseRefs.delete(el)
	})
	createEffect(() => {
		isSelected(id === menu.selected())
	})
	if (autofocus) {
		createEffect(() => {
			if (isSelected()) {
				el.scrollIntoView({ behavior: 'smooth' })
			}
		})
	}
}

export function Menu(props: { children: Component<MenuItemProps>, inputs?: MenuInputMap }) {
	const [selected, setSelected] = createSignal('')

	const refs = new Map<string, HTMLElement>()
	const inverseRefs = new Map<HTMLElement, string>()
	const disabledDirections = new Map<string, Accessor<('up' | 'down' | 'left' | 'right')[]>>()
	const update = () => {
		for (const direction of ['up', 'down', 'left', 'right'] as const) {
			if (props.inputs?.get(direction).justPressed) {
				const selectedId = createRoot(selected)
				const forbiddenDir = disabledDirections.get(selectedId)
				if (forbiddenDir && forbiddenDir().includes(direction)) continue
				const selectedElement = refs.get(selectedId)
				if (selectedElement) {
					const finder = findClosest(selectedElement, refs.values())
					const newSelectedElement = finder(direction)
					if (newSelectedElement) {
						const newSelected = inverseRefs.get(newSelectedElement)
						if (newSelected !== undefined) {
							setSelected(newSelected)
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
	const setSelectedRef = (el: HTMLElement) => {
		const id = inverseRefs.get(el)
		if (id) {
			setSelected(id)
		}
	}
	const selectedRef = createMemo(() => refs.get(selected()))
	ui.updateSync(update)
	const menu: MenuDir = { refs, inverseRefs, setSelected, selected, selectedRef, setSelectedRef, disabledDirections }

	return (

		<props.children
			menu={menu}
		/>
	)
}
