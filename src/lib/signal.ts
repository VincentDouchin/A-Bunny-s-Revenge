import type { AppStates, Resources } from './app'
import { Event } from 'eventery'
import atom from 'solid-use/atom'
import { app } from '@/global/states'

export const stateSignal = <S extends AppStates<typeof app>>(state: S) => {
	const signal = atom(app.isEnabled(state))
	const resources = atom<Resources<typeof app, S> | null>(app.getResources(state) ?? null)
	app.onEnter(state, (r) => {
		signal(true)
		resources(r)
	})
	app.onExit(state, () => {
		signal(false)
		resources(null)
	})
	return [signal, resources] as const
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