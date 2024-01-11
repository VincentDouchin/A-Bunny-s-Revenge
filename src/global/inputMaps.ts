import type { Entity } from './entity'
import { inputManager } from './init'
import type { InputMap } from '@/lib/inputs'
import { GAMEPAD_AXIS, GAMEPAD_BUTTON } from '@/lib/inputs'

const playerInputs = ['left', 'right', 'forward', 'backward', 'inventory', 'primary', 'pause', 'secondary'] as const
export type PlayerInputMap = InputMap<typeof playerInputs[number]>
export const playerInputMap = () => {
	const map = inputManager.createMap(playerInputs, true).setGamepads(0)
	map.get('right').setKeys('KeyD').setAxes(GAMEPAD_AXIS.LEFT_X, 1)
	map.get('left').setKeys('KeyA').setAxes(GAMEPAD_AXIS.LEFT_X, -1)
	map.get('forward').setKeys('KeyW').setAxes(GAMEPAD_AXIS.LEFT_Y, -1)
	map.get('backward').setKeys('KeyS').setAxes(GAMEPAD_AXIS.LEFT_Y, 1)
	map.get('inventory').setKeys('KeyE').setButtons(GAMEPAD_BUTTON.Y)
	map.get('primary').setKeys('Space').setButtons(GAMEPAD_BUTTON.A)
	map.get('secondary').setKeys('ShiftLeft').setButtons(GAMEPAD_BUTTON.X)
	map.get('pause').setKeys('Escape').setButtons(GAMEPAD_BUTTON.START)
	return { playerControls: map } as const satisfies Entity
}

const menuInputs = ['up', 'down', 'left', 'right', 'validate', 'cancel'] as const
export type MenuInputMap = InputMap<typeof menuInputs[number]>
export const menuInputMap = () => {
	const map = inputManager.createMap(menuInputs, true).setGamepads(0)
	map.get('up').setKeys('KeyW').setButtons(GAMEPAD_BUTTON.UP)
	map.get('down').setKeys('KeyS').setButtons(GAMEPAD_BUTTON.DOWN)
	map.get('left').setKeys('KeyA').setButtons(GAMEPAD_BUTTON.LEFT)
	map.get('right').setKeys('KeyD').setButtons(GAMEPAD_BUTTON.RIGHT)
	map.get('validate').setKeys('Enter', 'Space').setButtons(GAMEPAD_BUTTON.A)
	map.get('cancel').setKeys('Escape').setButtons(GAMEPAD_BUTTON.B)
	return { menuInputs: map } as const satisfies Entity
}