import type { AnimationAction, AnimationClip, Object3D, Object3DEventMap } from 'three'
import { AnimationMixer } from 'three'

export class Animator<K extends string> extends AnimationMixer {
	#current?: K
	#action?: AnimationAction
	#clips: AnimationClip[]
	constructor(current: K, scene: Object3D<Object3DEventMap>, animations: AnimationClip[]) {
		super(scene)
		this.#clips = animations
		this.playAnimation(current)
		this.playAnimation(current)
	}

	#getAction(animation?: K) {
		const clip = this.#clips.find(clip => clip.name === animation)
		if (clip) {
			return this.clipAction(clip)
		}
	}

	play(animation: K) {
		const action = this.#getAction(animation)
		if (action) {
			this.#action?.fadeOut(0.2)
			action.reset().fadeIn(0.2).play()
			this.#action = action
			this.#current = animation
		}
	}

	playAnimation(animation: K) {
		if (animation !== this.#current) {
			this.play(animation)
		}
	}
}