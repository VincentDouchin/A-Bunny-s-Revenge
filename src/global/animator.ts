import { type AnimationClip, AnimationMixer } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'

export class Animator<K extends string> extends AnimationMixer {
	last?: K
	#current: K
	#clips: AnimationClip[]
	constructor(current: K, glb: GLTF) {
		super(glb.scene)
		this.#clips = glb.animations
		this.#current = current
		this.play()
	}

	get changed() {
		return this.last !== this.#current
	}

	set current(value: K) {
		this.last = this.#current
		this.#current = value
		this.play()
	}

	get current() {
		return this.#current
	}

	get clip() {
		return this.#clips.find(clip => clip.name === this.#current)
	}

	play() {
		if (this.changed && this.clip) {
			this.clipAction(this.clip).play()
			this.last = this.#current
		}
	}
}