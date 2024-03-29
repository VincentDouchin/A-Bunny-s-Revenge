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

export const weaponBundle = (weaponName: weapons) => {
	const data = weaponsData[weaponName]
	const model = assets.weapons[weaponName].scene.clone()
	model.scale.setScalar(data.scale)
	return ecs.add({ model, weaponName })
}
