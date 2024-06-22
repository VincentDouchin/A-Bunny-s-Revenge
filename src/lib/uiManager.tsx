import type { JSXElement } from 'solid-js'
import { createSignal, onCleanup } from 'solid-js'
import { Dynamic, render } from 'solid-js/web'
import { save } from '@/global/save'

export class UIManager {
	root: HTMLElement
	constructor() {
		const el = document.createElement('div')
		el.style.position = 'fixed'
		el.style.inset = '0'
		el.style.display = 'grid'
		el.style.zIndex = '1'
		el.classList.add('no-events')
		document.body.appendChild(el)
		this.root = el
		this.setFontSize()
		this.setUiOpacity()
	}

	listeners = new Set<() => void>()

	render(ui: () => JSXElement) {
		return render(() =>
			<Dynamic component={ui}></Dynamic>, this.root)
	}

	setFontSize() {
		document.documentElement.style.setProperty('font-size', `${save.settings.uiScale / 10 * 2}vh`)
	}

	setUiOpacity() {
		document.documentElement.style.setProperty('--ui-opacity', `${save.settings.uiOpacity}%`)
	}

	sync<T>(data: () => T) {
		const [state, setState] = createSignal(data(), { equals: false })
		const refetch = () => setState(() => data())
		this.listeners.add(refetch)
		onCleanup(() => this.listeners.delete(refetch))

		return state
	}

	updateSync(fn: () => void) {
		this.listeners.add(fn)
		onCleanup(() => this.listeners.delete(fn))
	}

	update = () => {
		for (const listener of this.listeners) {
			listener()
		}
	}
}

export const textStroke = (color = 'white', size = 1) => ({ textShadow: `${size}px ${size}px ${color}, -${size}px ${size}px ${color}, ${size}px -${size}px ${color}, -${size}px -${size}px ${color}` })

export const windowEvent = <T extends keyof WindowEventMap>(event: T, listener: (e: WindowEventMap[T]) => void) => {
	window.addEventListener(event, listener)
	return () => window.removeEventListener(event, listener)
}
export const mediaEvent = (event: string, listener: (e: MediaQueryListEvent) => void) => {
	const mediaMatch = window.matchMedia(event)
	mediaMatch.addEventListener('change', listener)
	return () => mediaMatch.removeEventListener('change', listener)
}
export const atom = <T,>(initialValue: T) => {
	const [value, setValue] = createSignal<T>(initialValue)
	return (...newValue: Parameters<typeof setValue> | unknown[]): T => {
		if (newValue.length > 0) {
			// @ts-expect-error hack
			setValue(...newValue)
		}
		return value()
	}
}