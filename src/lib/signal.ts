import type { AppStates } from './app'
import { app } from '@/global/states'
import atom from 'solid-use/atom'

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