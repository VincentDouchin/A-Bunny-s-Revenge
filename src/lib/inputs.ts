import { createMap } from 'solid-proxies'
import atom from 'solid-use/atom'
import { Vector2, Vector3 } from 'three'
import { keys, metaKeys, mouse } from '@/constants/keys'

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
export enum MOUSE_BUTTONS {
	LEFT = 0,
	MIDDLE = 1,
	RIGHT = 2,
}
export enum MOUSE_WHEEL {
	X = 'x',
	Y = 'y',
	Z = 'z',
}
export type ControlType = 'gamepad' | 'touch' | 'keyboard'
export class InputManager {
	keys: Record<string, 0 | 1> = {}
	controls = atom<ControlType>('keyboard')
	#maps = new Set<InputMap<any>>()
	mouse: Record<number, boolean> = {}

	layoutMap: KeyboardLayoutMap | null = null
	mouseMoving = atom(false)
	mouseWorldPosition = new Vector3()
	mouseWheel = new Vector3()
	mousePosition = new Vector2()
	constructor() {
		window.addEventListener('wheel', (e) => {
			this.mouseWheel.x = e.deltaX
			this.mouseWheel.y = e.deltaY
			this.mouseWheel.z = e.deltaZ
		})
		window.addEventListener('keydown', (e) => {
			this.controls('keyboard')
			if (e.code in this.keys) {
				// e.preventDefault()
				this.keys[e.code] = 1
			}
		})
		window.addEventListener('keyup', (e) => {
			if (e.code in this.keys) {
				// e.preventDefault()
				this.keys[e.code] = 0
			}
		})
		window.addEventListener('touchstart', () => {
			this.controls('touch')
			this.mouse[0] = true
		})
		window.addEventListener('touchend', () => {
			this.mouse[0] = false
		})
		window.addEventListener('touchcancel', () => {
			this.mouse[0] = false
		})
		window.addEventListener('mousedown', (e) => {
			this.mouse[e.button] = true
		})
		window.addEventListener('contextmenu', (e) => {
			e.preventDefault()
		})
		window.addEventListener('mouseup', (e) => {
			this.mouse[e.button] = false
		})
		window.addEventListener('mousemove', (e) => {
			this.mousePosition.set(e.clientX, e.clientY)
		})

		if (navigator.keyboard) {
			navigator.keyboard.getLayoutMap().then((map) => {
				this.layoutMap = map
			})
		}
	}

	get mousePositionNormalized() {
		return this.mousePosition.clone().divide({ x: window.innerWidth, y: -window.innerHeight }).multiplyScalar(2).add({ x: -1, y: 1 })
	}

	getKeyName(input: Input, controls: 'mouse' | 'keyboard') {
		const keyNames = input.keys.map((key) => {
			const keyName = this.layoutMap?.get(key) ?? metaKeys[key]
			return keys[keyName]
		})
		const mouseButtons = input.mouse.map(m => mouse[m])
		if (mouseButtons.length && controls === 'mouse') {
			return mouseButtons
		}
		return keyNames
	}

	update = () => {
		const gamepads = navigator.getGamepads().filter(Boolean)
		for (const map of this.#maps) {
			map.update(gamepads)
		}
		for (const wheelDirection of [MOUSE_WHEEL.X, MOUSE_WHEEL.Y, MOUSE_WHEEL.Z]) {
			this.mouseWheel[wheelDirection] = 0
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
	mouse: number[] = []
	mouseWheel: [MOUSE_WHEEL, 1 | -1][] = []
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

	setMouse(...buttons: MOUSE_BUTTONS[]) {
		this.mouse.push(...buttons)
		return this
	}

	setMouseWheel(axis: MOUSE_WHEEL, direction: 1 | -1) {
		this.mouseWheel.push([axis, direction])
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
		if (this.#manager.controls() !== 'touch') {
			for (const bubtton of this.mouse) {
				if (this.#manager.mouse[bubtton]) {
					this.pressed = 1
				}
			}
			for (const [axis, direction] of this.mouseWheel) {
				const amount = this.#manager.mouseWheel[axis]
				if (amount !== 0 && Math.sign(amount) === direction) {
					this.pressed = 1
				}
			}
		}
		for (const gamepad of gamepads) {
			for (const button of this.buttons) {
				if (gamepad.buttons[button].pressed) {
					this.pressed = gamepad.buttons[button].value
					this.#manager.controls('gamepad')
				}
			}
			for (const [axis, direction] of this.axes) {
				const amount = gamepad.axes[axis]
				if (Math.abs(amount) > 0.1) {
					this.#manager.controls('gamepad')
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

export class TouchController<Buttons extends string> {
	#buttons = createMap<Buttons, number>()
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