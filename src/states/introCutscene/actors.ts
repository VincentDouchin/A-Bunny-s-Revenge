import { Quaternion, Vector3 } from 'three'
import { SkeletonUtils } from 'three-stdlib'
import { Animator } from '@/global/animator'
import { assets, ecs } from '@/global/init'

const markersQuery = ecs.with('marker', 'position')
const levelQuery = ecs.with('map')
export const spawnIntroActors = () => {
	const parent = levelQuery.first
	if (!parent) {
		throw new Error('level not found')
	}
	for (const { marker, position } of markersQuery) {
		if (marker === 'boss-position-start') {
			const model = SkeletonUtils.clone(assets.characters.death_mage.scene)
			model.scale.setScalar(5)
			const animator = new Animator(model, assets.characters.death_mage.animations)
			const entity = ecs.add({
				parent,
				position,
				rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
				model,
				deathMageAnimator: animator,
				cameraTarget: true,
				worldPosition: position.clone(),
			})
			entity.deathMageAnimator.playAnimation('Idle', { timeScale: 0.2 })
		}
		if (marker === 'minion-position-2') {
			const model = SkeletonUtils.clone(assets.characters.Gloom.scene)
			model.scale.setScalar(5)
			const animator = new Animator(model, assets.characters.Gloom.animations)
			ecs.add({
				parent,
				position,
				rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
				model,
				worldPosition: position.clone(),
				animator,
			})
			animator.playAnimation('Idle', { timeScale: 0.2 })
		}
	}
}