import type { Entity } from '@/global/entity'
import type { Material } from 'three'
import { Animator } from '@/global/animator'
import { assets, ecs, tweens } from '@/global/init'
import { getRandom, objectKeys } from '@/utils/mapFunctions'
import { Mesh, Vector3 } from 'three'

export const addExploder = (parent: Entity, mat: Material, scale: number) => {
	const model = assets.models.explode.scene.clone()
	model.scale.setScalar(scale)
	model.traverse((node) => {
		if (node.name === 'Plane') {
			node.visible = false
		}
		else if (node instanceof Mesh) {
			node.material = mat.clone()
			node.material.transparent = true
			node.material.depthWrite = false
			node.visible = false
		}
	})
	const explodeAnimator = new Animator<Animations['explode']>(model, assets.models.explode.animations)
	const available = new Set(objectKeys(explodeAnimator.animationClips))
	const explode = (amount: number) => {
		for (let i = 0; i < amount; i++) {
			if (available.size === 0) return
			const explode = getRandom([...available])
			available.delete(explode)
			explodeAnimator.playClamped(explode, { overwrite: false })

			const fragments: Mesh<any, Material>[] = (explodeAnimator.action as any)?._propertyBindings.flatMap((x: any) => x.binding.node.children)
			if (fragments) {
				fragments.forEach(node => node.visible = true)

				setTimeout(() => tweens.add({
					from: 1,
					to: 0,
					duration: 1000,
					onUpdate: (f) => {
						fragments.forEach(node => node.material.opacity = f)
					},

				}), 500)
			}
		}
	}
	const exploder = ecs.add({
		model,
		explodeAnimator,
		position: new Vector3(),
		explode,
		parent,
	})
	ecs.update(parent, { exploder })
}
