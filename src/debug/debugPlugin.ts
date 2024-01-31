import { debugState } from './debugState'
import type { State } from '@/lib/state'

const enableDebugState = () => {
	const listener = (e: KeyboardEvent) => {
		if (e.key === 'F3') {
			e.preventDefault()
			debugState.enable()
		}
	}
	window.addEventListener('keydown', listener)
	return () => {
		window.removeEventListener('keydown', listener)
	}
}

export const debugPlugin = (state: State) => {
	state.addSubscriber(enableDebugState)
}