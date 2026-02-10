import type { AssetNames, Entity } from '@/global/entity'
import { Event } from 'eventery'
import { Quaternion, Vector3 } from 'three'
import { weaponsData } from '@/constants/weapons'
import { Interactable } from '@/global/entity'
import { assets, coroutines, ecs } from '@/global/init'
import { app } from '@/global/states'
import { objectKeys } from '@/utils/mapFunctions'
import { weaponBundle } from '../game/weapon'

const weaponNames = objectKeys(assets.weapons)
const displayWeapon = (weaponName: AssetNames['weapons'], parent: Entity) => {
	const weaponModel = assets.weapons[weaponName].scene.clone()
	weaponModel.scale.setScalar(weaponsData[weaponName].scale * 1.2)
	const weapon = ecs.add({
		model: weaponModel,
		position: new Vector3(0, 7, 0),
		rotation: new Quaternion(),
		weaponName,
		parent,
	})
	ecs.update(parent, { interactable: Interactable.WeaponStand })
	coroutines.add(function* () {
		let rotation = 0
		while (app.isEnabled('clearing')) {
			yield
			rotation += 0.02
			weapon.rotation.setFromAxisAngle(new Vector3(0, 1, 0), rotation)
		}
	})
	return weaponModel
}
const chooseWeaponEvent = new Event<[AssetNames['weapons']]>()
const stumpQuery = ecs.with('weaponStand')
export const spawnWeaponsChoice = () => {
	for (let i = 0; i < stumpQuery.size; i++) {
		const stump = stumpQuery.entities[i]
		const weaponName = weaponNames[i]
		const weaponModel = displayWeapon(weaponName, stump)
		const unsub = chooseWeaponEvent.subscribe((weaponEquipped) => {
			weaponModel.visible = weaponEquipped !== weaponName
		})
		ecs.update(stump, {
			weaponName,
			onPrimary(_stump, player) {
				ecs.removeComponent(player, 'weapon')
				chooseWeaponEvent.emit(weaponName)
				ecs.update(player, { weapon: weaponBundle(weaponName) })
			},
			onDestroy() {
				unsub()
			},
		})
	}
}
