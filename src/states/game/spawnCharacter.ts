import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { LinearSRGBColorSpace, Mesh, NearestFilter, Quaternion, Vector3 } from 'three'
import { healthBundle } from '../dungeon/health'
import { inventoryBundle } from './inventory'
import { Sizes } from '@/constants/sizes'
import { Animator } from '@/global/animator'
import { type Entity, Faction, MenuType } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { playerInputMap } from '@/global/inputMaps'
import { save } from '@/global/save'
import type { FarmRessources } from '@/global/states'
import { modelColliderBundle } from '@/lib/models'
import type { System } from '@/lib/state'
import { stateBundle } from '@/lib/stateMachine'
import { Stat, addModifier } from '@/lib/stats'

export const playerBundle = () => {
	const model = assets.characters.BunnydAnim
	model.scene.traverse((node) => {
		if (node instanceof Mesh && node.material.map) {
			node.material.map.colorSpace = LinearSRGBColorSpace
			node.material.map.minFilter = NearestFilter
			node.material.map.magFilter = NearestFilter
		}
	})
	const bundle = modelColliderBundle(model.scene, RigidBodyType.Dynamic, false, Sizes.character)
	bundle.bodyDesc.setLinearDamping(20)

	const player = {
		...playerInputMap(),
		...inventoryBundle(MenuType.Player, 24, 'player'),
		...bundle,
		playerAnimator: new Animator(bundle.model, model.animations),
		inMap: true,
		cameratarget: true,
		faction: Faction.Player,
		sensor: true,
		player: true,
		movementForce: new Vector3(),
		speed: 300,
		strength: new Stat(1),
		...healthBundle(5),
		...stateBundle<'idle' | 'running' | 'picking'>('idle', {
			idle: ['running', 'picking'],
			running: ['idle'],
			picking: ['idle'],
		}),
		// state: 'idle',
		// stateMachine: new StateMachine<'idle' | 'running' | 'picking'>('idle')
		// 	.addTransition('idle', ['running'])
		// 	.addTransition('running', ['idle']),
	} as const satisfies Entity
	for (const mod of save.modifiers) {
		addModifier(mod, player)
	}
	return player
}

export const spawnCharacter: System<FarmRessources> = ({ previousState }) => {
	const [position, rotation] = previousState === 'dungeon'
		? [new Vector3(), new Quaternion()]
		: [new Vector3().fromArray(save.playerPosition), new Quaternion().fromArray(save.playerRotation)]

	ecs.add({
		...playerBundle(),
		position,
		rotation,
	})
}
