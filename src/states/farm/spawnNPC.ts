import { Vector3 } from 'three'
import { NPCBundle } from '../game/NPCBundle'
import { dialogBundle } from '../game/dialog'
import { ecs } from '@/global/init'

export const spawnNPC = () => {
	ecs.add({
		...NPCBundle('Panda'),
		position: new Vector3(10, 0, 0),
		scale: 3,
		...dialogBundle('Panda'),
	})
}