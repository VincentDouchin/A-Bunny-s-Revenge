import type { AppStates } from './app'
import { Event } from 'eventery'
import atom from 'solid-use/atom'
import { app } from '@/global/states'

export const stateSignal = (state: AppStates<typeof app>) => {
	const signal = atom(app.isEnabled(state))
	app.onEnter(state, () => {
		signal(true)
	})
	app.onExit(state, () => {
		signal(false)
	})
	return signal
}

export const sharedSignal = <T>(val: T) => {
	const event = new Event<[T]>()
	event.subscribe((newVal) => {
		val = newVal
	})
	return {
		event,
		signal() {
			const signal = atom(val)
			event.subscribe((newVal) => {
				signal(newVal)
			})
			return signal
		},
	}
}