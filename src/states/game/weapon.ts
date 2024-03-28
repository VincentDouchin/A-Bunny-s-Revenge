import type { weapons } from '@assets/assets'
import { assets, ecs } from '@/global/init'
import { weaponsData } from '@/constants/weapons'

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

export const weaponBundle = (weapon: weapons) => {
	const data = weaponsData[weapon]
	const model = assets.weapons[weapon].scene.clone()
	model.scale.setScalar(data.scale)
	return ecs.add({ model })
}
