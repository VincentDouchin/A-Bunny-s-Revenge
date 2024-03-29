import { metaKeys } from '@/constants/keys'

export const GAMEPAD_AXIS = {
	LEFT_X: 0,
	LEFT_Y: 1,
	RIGHT_X: 2,
	RIGHT_Y: 3,
}
export const OPPOSITE_AXIS = {
	0: 1,
	1: 0,
	2: 3,
	3: 2,
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

export class InputManager {
	keys: Record<string, 0 | 1> = {}
	controls: 'gamepad' | 'touch' | 'keyboard' = 'keyboard'
	#maps = new Set<InputMap<any>>()
	layoutMap: KeyboardLayoutMap | null = null
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
		window.addEventListener('keydown', () => {
			this.controls = 'keyboard'
		})
		window.addEventListener('touchstart', () => {
			this.controls = 'touch'
		})
		if (navigator.keyboard) {
			navigator.keyboard.getLayoutMap().then((map) => {
				this.layoutMap = map
			})
		}
	}

	getKeyName(input: Input) {
		return input.keys.map(key => this.layoutMap?.get(key) ?? metaKeys[key])
	}

	update = () => {
		const gamepads = navigator.getGamepads().filter(Boolean)
		for (const map of this.#maps) {
			map.update(gamepads)
		}
	}

	createMap<K extends string>(inputs: readonly K[], touch = false) {
		const map = new InputMap(this, inputs, touch)
		this.#maps.add(map)
		return map as InputMap<K>
	}
}

export class Input {
	pressed = 0
	wasPressed = 0
	keys: string[] = []
	buttons: number[] = []
	axes: [number, 1 | -1][] = []
	#manager: InputManager
	constructor(manager: InputManager) {
		this.#manager = manager
	}

	setKeys(...keys: string[]) {
		this.keys.push(...keys)
		for (const key of keys) {
			this.#manager.keys[key] = 0
		}
		return this
	}

	setButtons(...buttons: number[]) {
		this.buttons.push(...buttons)
		return this
	}

	setAxes(axis: number, direction: 1 | -1) {
		this.axes.push([axis, direction])
		return this
	}

	update(gamepads: Gamepad[], touchValue?: number) {
		this.wasPressed = this.pressed
		this.pressed = 0
		if (touchValue !== undefined) {
			this.pressed = touchValue
		}
		for (const key of this.keys) {
			if (this.#manager.keys[key])
				this.pressed = 1
		}
		for (const gamepad of gamepads) {
			for (const button of this.buttons) {
				if (gamepad.buttons[button].pressed) {
					this.pressed = gamepad.buttons[button].value
				}
			}
			for (const [axis, direction] of this.axes) {
				const amount = gamepad.axes[axis]
				if (Math.abs(amount) > 0.1) {
					if (Math.sign(amount) === direction) {
						this.pressed = Math.abs(amount)
					} else {
						this.pressed = 0
					}
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

export class TouchController< Buttons extends string> {
	#buttons = new Map<Buttons, number>()
	constructor(...buttons: Buttons[]) {
		for (const button of buttons) {
			this.#buttons.set(button, 0)
		}
	}

	set(key: Buttons, value: number) {
		return this.#buttons.set(key, value)!
	}

	get(key: Buttons) {
		return this.#buttons.get(key)!
	}
}

export class InputMap<K extends string> {
	#inputs = new Map<K, Input>()
	#manager: InputManager
	#gamepads: number[] = []
	touchController: null | TouchController<K> = null
	constructor(manager: InputManager, actions: readonly K[], touch?: boolean) {
		this.#manager = manager
		for (const action of actions) {
			this.#inputs.set(action, new Input(this.#manager))
		}
		if (touch) {
			this.touchController = new TouchController(...actions)
		}
	}

	update(gamepads: Gamepad[]) {
		const gamepadsToUse = gamepads.filter(g => g !== null && this.#gamepads.includes(g?.index))
		for (const [name, input] of this.#inputs.entries()) {
			const touchValue = this.touchController?.get(name)
			input.update(gamepadsToUse, touchValue)
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