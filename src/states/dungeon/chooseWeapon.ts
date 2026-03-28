import type { AssetNames, Entity } from '@/global/entity'
import { Event } from 'eventery'
import { bounceOut, linear } from 'popmotion'
import { Group, Quaternion, Vector3 } from 'three/webgpu'
import { weaponsData } from '@/constants/weapons'
import { Interactable } from '@/global/entity'
import { assets, ecs, tweens } from '@/global/init'
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
		group: new Group(),
	})
	ecs.update(parent, { interactable: Interactable.WeaponStand })
	tweens.add({
		parent,
		repeat: Number.POSITIVE_INFINITY,
		repeatType: 'loop',
		duration: 5000,
		ease: linear,
		to: Math.PI * 2,
		onUpdate(f) {
			weapon.rotation.setFromAxisAngle(new Vector3(0, 1, 0), f)
		},
	})

	return weapon
}
const chooseWeaponEvent = new Event<[AssetNames['weapons']]>()
const stumpQuery = ecs.with('weaponStand')
export const spawnWeaponsChoice = () => {
	for (let i = 0; i < stumpQuery.size; i++) {
		const stump = stumpQuery.entities[i]
		const weaponName = weaponNames[i]
		const weapon = displayWeapon(weaponName, stump)
		const unsub = chooseWeaponEvent.subscribe((weaponEquipped) => {
			const wasVisible = weapon.model.visible
			weapon.model.visible = weaponEquipped !== weaponName
			if (wasVisible !== weapon.model.visible) {
				tweens.add({
					from: 0.5,
					to: 1,
					duration: 500,
					ease: bounceOut,
					onUpdate(f) {
						weapon.group.scale.setScalar(f)
					},
				})
			}
		})
		const onDestroy = new Event()
		onDestroy.subscribe(unsub)
		ecs.update(stump, {
			weaponName,
			onPrimary(_stump, player) {
				ecs.removeComponent(player, 'weapon')
				chooseWeaponEvent.emit(weaponName)
				ecs.update(player, { weapon: weaponBundle(weaponName) })
			},
			onDestroy,
		})
	}
}
