import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { Box3, Quaternion, Vector3 } from 'three'
import type { playerAnimations } from '@/constants/animations'
import { Animator } from '@/global/animator'
import { assets, ecs } from '@/global/init'
import { playerInputMap } from '@/lib/inputs'
import type { System } from '@/lib/state'
import type { DungeonRessources } from '@/global/states'

const playerBundle = () => {
	const model = assets.characters.BunnyMain
	const size = new Vector3()
	new Box3().setFromObject(model.scene).getSize(size)
	size.divideScalar(2)
	return {
		inMap: true,
		model: model.scene,
		playerControls: playerInputMap(),
		bodyDesc: RigidBodyDesc.dynamic().setCcdEnabled(true).lockRotations().setLinearDamping(7),
		colliderDesc: ColliderDesc.cuboid(size.x, size.y, size.z).setTranslation(0, size.y, 0),
		playerAnimator: new Animator<playerAnimations>('idle', model),
		rotation: new Quaternion(),
		cameratarget: true,
	} as const
}

export const spawnCharacter = () => {
	ecs.add({
		...playerBundle(),
		position: new Vector3(0, 0, 0),
	})
}
const doorQuery = ecs.with('door', 'position')
export const spawnCharacterDungeon: System<DungeonRessources> = ({ direction }) => {
	for (const { door, position } of doorQuery) {
		if (door.direction === direction) {
			ecs.add({
				...playerBundle(),
				position: position.clone(),
			})
		}
	}
}