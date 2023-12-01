import { createSignal, onCleanup } from 'solid-js'
import type { JSX } from 'solid-js/jsx-runtime'
import { render } from 'solid-js/web'

export class UIManager {
	root: Element
	constructor() {
		const el = document.createElement('div')
		el.style.position = 'fixed'
		el.style.inset = '0'
		el.style.display = 'grid'
		// el.style.pointerEvents = 'none'
		el.style.zIndex = '1'
		document.body.appendChild(el)
		this.root = el
	}

	listeners = new Set<() => void>()

	render(ui: () => JSX.Element) {
		return () => render(() => ui(), this.root)
	}

	sync<T>(data: () => T) {
		const [state, setState] = createSignal(data(), { equals: false })
		const refetch = () => setState(() => data())
		this.listeners.add(refetch)
		onCleanup(() => this.listeners.delete(refetch))
		return state
	}

	update = () => {
		for (const listener of this.listeners) {
			listener()
		}
	}
}

export const textStroke = (color = 'white', size = 1) => ({ textShadow: `${size}px ${size}px ${color}, -${size}px ${size}px ${color}, ${size}px -${size}px ${color}, -${size}px -${size}px ${color}` })
