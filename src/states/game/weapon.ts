import { assets, ecs } from '@/global/init'

const weaponQuery = ecs.with('weapon', 'model')
export const addOrRemoveWeaponModel = [
	() => weaponQuery.onEntityAdded.subscribe((entity) => {
		entity.model.traverse((node) => {
			if (node.name === 'DEF_FingerL') {
				node.add(entity.weapon.model)
			}
		})
	}),
	() => weaponQuery.onEntityRemoved.subscribe((entity) => {
		entity.weapon.model.removeFromParent()
	}),
]

export const weaponBundle = () => {
	const model = assets.weapons.Ladle.scene.clone()
	model.scale.setScalar(2)
	return ecs.add({ model })
}
