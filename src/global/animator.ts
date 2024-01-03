import type { AnimationAction, AnimationClip, Object3D, Object3DEventMap } from 'three'
import { AnimationMixer } from 'three'

interface Animation<T extends string> extends AnimationClip {
	name: T
}
export class Animator<K extends string> extends AnimationMixer {
	#current?: K
	action?: AnimationAction
	#clips: AnimationClip[]
	constructor(current: K, scene: Object3D<Object3DEventMap>, animations: Animation<K>[]) {
		super(scene)
		this.#clips = animations
		this.playAnimation(current)
	}

	#getAction(animation?: K) {
		const clip = this.#clips.find(clip => clip.name === animation)
		if (clip) {
			return this.clipAction(clip)
		}
	}

	has(...animations: K[]): this is Animator<K> {
		return animations.every(a => this.#clips.some(clip => clip.name === a))
	}

	play(animation: K) {
		const action = this.#getAction(animation)
		if (action) {
			this.action?.fadeOut(0.2)
			action.reset().fadeIn(0.2).play()
			this.action = action
			this.#current = animation
		} else {
			console.warn(`animation ${animation} not found`)
		}
	}

	playOnce(animation: K, reset = true, stop = false) {
		if (animation === this.#current) return
		return new Promise<void>((resolve) => {
			const current = this.#current
			const action = this.#getAction(animation)
			if (action && current) {
				this.play(animation)
				if (reset) {
					setTimeout(() => {
						this.play(current)
					}, (action.getClip().duration - 0.2) * 1000)
				} else {
					setTimeout(() => {
						if (stop) {
							action.timeScale = 0
							action.paused = true
						}

						resolve()
					}, action.getClip().duration * 1000)
				}
			} else {
				resolve()
			}
		})
	}

	playAnimation(animation: K) {
		if (animation !== this.#current) {
			this.play(animation)
		}
	}
}
