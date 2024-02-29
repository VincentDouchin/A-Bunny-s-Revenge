import { LinearSRGBColorSpace, Mesh, NearestFilter, Quaternion, Vector3 } from 'three'
import { healthBundle } from '../dungeon/health'
import { inventoryBundle } from './inventory'
import { Sizes } from '@/constants/sizes'
import { Animator } from '@/global/animator'
import { type Entity, Faction } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { playerInputMap } from '@/global/inputMaps'
import { save, updateSave } from '@/global/save'
import { type FarmRessources, openMenuState } from '@/global/states'
import { capsuleColliderBundle } from '@/lib/models'
import type { System } from '@/lib/state'
import { stateBundle } from '@/lib/stateMachine'
import { Stat, addModifier } from '@/lib/stats'

export const playerBundle = (health = 5) => {
	const model = assets.characters.BunnydAnim
	model.scene.traverse((node) => {
		if (node instanceof Mesh && node.material.map) {
			node.material.map.colorSpace = LinearSRGBColorSpace
			node.material.map.minFilter = NearestFilter
			node.material.map.magFilter = NearestFilter
			node.material.opacity = 1
		}
	})
	const bundle = capsuleColliderBundle(model.scene, Sizes.character)
	bundle.bodyDesc.setLinearDamping(20)
	const player = {
		...playerInputMap(),
		...inventoryBundle(24, 'player'),
		...bundle,
		playerAnimator: new Animator(bundle.model, model.animations),
		inMap: true,
		cameratarget: true,
		initialCameratarget: true,
		faction: Faction.Player,
		sensor: true,
		player: true,
		movementForce: new Vector3(),
		speed: 150,
		strength: new Stat(1),
		critChance: new Stat(0.05),
		critDamage: new Stat(0.20),
		lastStep: { right: false, left: false },
		...healthBundle(5, health),
		...stateBundle<'idle' | 'running' | 'picking' | 'hit' | 'dying' | 'dead'>('idle', {
			idle: ['running', 'picking', 'hit'],
			running: ['idle', 'hit'],
			picking: ['idle'],
			hit: ['idle', 'dying'],
			dying: ['dead'],
			dead: [],
		}),
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
	if (previousState === 'dungeon') {
		updateSave(s => s.modifiers = [])
	}
	ecs.add({
		...playerBundle(),
		position,
		rotation,
	})
}
const playerQuery = ecs.with('player', 'position')

export const losingBattle = () => playerQuery.onEntityRemoved.subscribe((e) => {
	openMenuState.enable()
	ecs.add({ inMap: true, position: e.position, cameratarget: true })
})