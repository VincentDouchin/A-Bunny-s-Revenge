export const GAMEPAD_AXIS = {
	LEFT_X: 0,
	LEFT_Y: 1,
	RIGHT_X: 2,
	RIGHT_Y: 3,
}

export const GAMEPAD_BUTTON = {
	A: 0,
	B: 1,
	X: 2,
	Y: 3,
	L: 4,
	R: 5,
	L2: 6,
	R2: 7,
	SELECT: 8,
	START: 9,
	L3: 10,
	R3: 11,
	UP: 12,
	DOWN: 13,
	LEFT: 14,
	RIGHT: 15,
} as const

export const InputManager = new class {
	keys: Record<string, 0 | 1> = {}
	constructor() {
		window.addEventListener('keydown', (e) => {
			if (e.code in this.keys) {
				this.keys[e.code] = 1
			}
		})
		window.addEventListener('keyup', (e) => {
			if (e.code in this.keys) {
				this.keys[e.code] = 0
			}
		})
	}
}()

export class Input {
	pressed = 0
	wasPressed = 0
	#keys: string[] = []
	#buttons: number[] = []
	setKeys(...keys: string[]) {
		this.#keys.push(...keys)
		for (const key of keys) {
			InputManager.keys[key] = 0
		}
		return this
	}

	setButtons(...buttons: number[]) {
		this.#buttons.push(...buttons)
	}

	update(gamepads: Gamepad[]) {
		this.wasPressed = this.pressed
		this.pressed = 0
		for (const key of this.#keys) {
			this.pressed = InputManager.keys[key]
		}
		for (const gamepad of gamepads) {
			for (const button of this.#buttons) {
				if (gamepad.buttons[button].pressed) {
					this.pressed = gamepad.buttons[button].value
				}
			}
		}
	}

	get justPressed() {
		return this.pressed > 0 && this.wasPressed === 0
	}

	get justReleased() {
		return this.pressed === 0 && this.wasPressed > 0
	}
}
export class InputMap<K extends string> {
	#inputs = new Map<K, Input>()
	static #maps = new Set<InputMap<any>>()
	#gamepads: number[] = []
	constructor(actions: readonly K[]) {
		for (const action of actions) {
			this.#inputs.set(action, new Input())
		}
		InputMap.#maps.add(this)
	}

	static update() {
		const gamepads = navigator.getGamepads().filter(Boolean)
		for (const map of InputMap.#maps) {
			map.update(gamepads)
		}
	}

	update(gamepads: Gamepad[]) {
		const gamepadsToUse = gamepads.filter(g => g !== null && this.#gamepads.includes(g?.index))
		for (const input of this.#inputs.values()) {
			input.update(gamepadsToUse)
		}
	}

	get(action: K) {
		return this.#inputs.get(action)!
	}

	setGamepads(...gamepads: number[]) {
		this.#gamepads = gamepads
		return this
	}
}
export type PlayerInputMap = ReturnType<typeof playerInputMap>
export const playerInputMap = () => {
	const map = new InputMap(['left', 'right', 'forward', 'backward', 'plant', 'inventory'])
	map.get('left').setKeys('KeyA')
	map.get('right').setKeys('KeyD')
	map.get('forward').setKeys('KeyW')
	map.get('backward').setKeys('KeyS')
	map.get('plant').setKeys('Space')
	map.get('inventory').setKeys('KeyE')
	return map
}