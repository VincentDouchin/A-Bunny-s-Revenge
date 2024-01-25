import type { AnimationAction, AnimationClip, Object3D, Object3DEventMap } from 'three'
import { AnimationMixer, LoopOnce } from 'three'

export class Animator<K extends string> extends AnimationMixer {
	#current?: K
	action?: AnimationAction
	#animationClips: AnimationClip[]
	constructor(scene: Object3D<Object3DEventMap>, animations: AnimationClip[]) {
		super(scene)
		this.#animationClips = animations
	}

	#getAction(animation?: K) {
		const clip = this.#animationClips.find(clip => clip.name === animation)
		if (clip) {
			return this.clipAction(clip)
		}
	}

	#play(animation: K) {
		const action = this.#getAction(animation)!
		this.action?.fadeOut(0.2)
		action.reset().fadeIn(0.2).play()
		this.action = action
		this.#current = animation
	}

	playOnce(animation: K) {
		const action = this.#getAction(animation)!
		action.reset()
		action.setLoop(LoopOnce, 1)
		action.fadeOut(0.2)
		this.#play(animation)
		return new Promise<void>((resolve) => {
			setTimeout(resolve, (action.getClip().duration - 0.2) * 1000)
		})
	}

	playClamped(animation: K) {
		const action = this.#getAction(animation)!
		action.reset()
		action.setLoop(LoopOnce, 1)
		action.clampWhenFinished = true
		this.#play(animation)
		return new Promise<void>((resolve) => {
			const finishListener = () => {
				resolve()
				this.removeEventListener('finished', finishListener)
			}
			this.addEventListener('finished', finishListener)
		})
	}

	playAnimation(animation: K) {
		if (animation !== this.#current) {
			this.#play(animation)
		}
	}
}
