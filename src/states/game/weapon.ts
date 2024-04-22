import type { weapons } from '@assets/assets'
import { Object3D } from 'three'
import { weaponsData } from '@/constants/weapons'
import { assets, ecs } from '@/global/init'
import { scene } from '@/global/rendering'
import { getWorldPosition } from '@/lib/transforms'
import { WeaponArc } from '@/shaders/weaponArc'

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
	const tip = new Object3D()
	tip.name = 'tip'
	tip.position.setZ(4)
	model.add(tip)
	model.scale.setScalar(data.scale)

	return ecs.add({ model, weaponName, weaponArc: new WeaponArc() })
}
const weaponArcQuery = ecs.with('weapon', 'group', 'state')
export const updateWeaponArc = () => {
	for (const entity of weaponArcQuery) {
		const weapon = entity.weapon
		if (entity.state === 'attack') {
			const parentPosition = getWorldPosition(weapon.model)
			const tipPosition = getWorldPosition(weapon.model.getObjectByName('tip')!)
			if (parentPosition) {
				scene.add(weapon.weaponArc)
				weapon.weaponArc.addVertices(parentPosition, tipPosition)
			}
		} else {
			weapon.weaponArc.removeVertices()
		}
	}
}
