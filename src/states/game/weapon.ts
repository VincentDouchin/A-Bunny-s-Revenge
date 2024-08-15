import type { weapons } from '@assets/assets'
import { weaponsData } from '@/constants/weapons'
import { assets, ecs } from '@/global/init'
import { scene } from '@/global/rendering'
import { getWorldPosition } from '@/lib/transforms'
import { WeaponArc } from '@/shaders/weaponArc'

export const weaponBundle = (weaponName: weapons) => {
	const data = weaponsData[weaponName]
	const model = assets.weapons[weaponName].scene.clone()
	model.rotateZ(Math.PI / 2)
	model.scale.setScalar(data.scale / 4.5)
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
