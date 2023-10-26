import type { InputMap } from './inputs'
import type { State } from './state'
import type { ComponentsOfType } from '@/global/entity'
import { ecs } from '@/global/init'

export const updateInputs = (...inputMaps: ComponentsOfType<InputMap<any>>[]) => (state: State) => {
	for (const inputMap of inputMaps) {
		const query = ecs.with(inputMap)
		state.onPreUpdate(() => {
			for (const entity of query) {
				entity[inputMap].updateInputsFromGamepad(navigator.getGamepads())
			}
		})
		state.onPostUpdate(() => {
			for (const entity of query) {
				entity[inputMap].reset()
			}
		})
	}
}