import type { AnimationAction, AnimationClip } from 'three'
import { AnimationMixer } from 'three'

import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'

export class Animator<K extends string> extends AnimationMixer {
	#current?: K
	#action?: AnimationAction
	#clips: AnimationClip[]
	constructor(current: K, glb: GLTF) {
		super(glb.scene)
		this.#clips = glb.animations
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
			this.#action?.fadeOut(1)
			action.reset().fadeIn(1).play()
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