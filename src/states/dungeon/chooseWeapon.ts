import type { weapons } from '@assets/assets'
import { ActiveCollisionTypes, ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { Quaternion, Vector3 } from 'three'
import { weaponBundle } from '../game/weapon'
import { assets, coroutines, ecs } from '@/global/init'
import { weaponsData } from '@/constants/weapons'
import type { Entity } from '@/global/entity'
import { Interactable } from '@/global/entity'
import { inMap } from '@/lib/hierarchy'
import { genDungeonState } from '@/global/states'

const weaponNames = ['Hoe', 'Ladle', 'ScissorWeapon', 'SwordWeapon'] as const satisfies readonly weapons[]
const displayWeapon = (weaponName: weapons, parent: Entity) => {
	const weaponModel = assets.weapons[weaponName].scene.clone()
	weaponModel.scale.setScalar(weaponsData[weaponName].scale * 1.2)
	weaponModel.rotateX(Math.PI / 2 * 3)
	const weapon = ecs.add({
		model: weaponModel,
		position: new Vector3(0, 7, 0),
		rotation: new Quaternion(),
		weaponName,
		parent,
	})
	coroutines.add(function* () {
		let rotation = 0
		while (genDungeonState.enabled) {
			yield
			rotation += 0.02
			weapon.rotation.setFromAxisAngle(new Vector3(0, 1, 0), rotation)
		}
	})
}
const stumpQuery = ecs.with('weaponStand')
const weaponDisplayedQuery = ecs.with('weaponName', 'parent')
const chooseWeapon = (weaponName: weapons) => {
	for (const stump of stumpQuery) {
		let foundWeapon = false
		for (const weaponDisplayed of weaponDisplayedQuery) {
			if (weaponDisplayed.parent === stump) {
				foundWeapon = true
				if (stump.weaponStand === weaponName) {
					ecs.remove(weaponDisplayed)

					ecs.removeComponent(stump, 'interactable')
				}
			}
		}
		if (!foundWeapon) {
			ecs.addComponent(stump, 'interactable', Interactable.WeaponStand)
			displayWeapon(stump.weaponStand, stump)
		}
		ecs.reindex(stump)
	}
}

export const spawnWeaponsChoice = () => {
	for (let i = 0; i < weaponNames.length; i++) {
		const stumpModel = assets.models.TreeStump.scene.clone()
		stumpModel.scale.setScalar(10)
		const offsetX = i * 20 - (weaponNames.length - 1) / 2 - 50

		const weaponName = weaponNames[i]
		const stump = ecs.add({
			model: stumpModel,
			position: new Vector3(offsetX, 0, -20),
			bodyDesc: RigidBodyDesc.fixed().lockRotations(),
			colliderDesc: ColliderDesc.cylinder(4, 3).setActiveCollisionTypes(ActiveCollisionTypes.ALL),
			rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.random() * Math.PI * 2),
			...inMap(),
			weaponStand: weaponName,
			interactable: Interactable.WeaponStand,
			onPrimary(_stump, player) {
				ecs.removeComponent(player, 'weapon')
				// player.playerAnimator?.enter('cheer', player)
				chooseWeapon(weaponName)
				ecs.update(player, { weapon: weaponBundle(weaponName) })
			},
		})
		displayWeapon(weaponName, stump)
	}
}
