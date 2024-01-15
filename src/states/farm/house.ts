import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { BoxGeometry, Mesh, MeshStandardMaterial, Vector3 } from 'three'

import { ecs } from '@/global/init'
import { modelColliderBundle } from '@/lib/models'
import { dialogs } from '@/constants/dialogs'
import { Interactable } from '@/global/entity'

export const spawnHouse = (position: Vector3) => {
	const houseModel = new Mesh(
		new BoxGeometry(30, 20, 30),
		new MeshStandardMaterial({ color: 0x944F00 }),
	)
	const doorModel = new Mesh(
		new BoxGeometry(10, 15, 2),
		new MeshStandardMaterial({ color: 0x753F00 }),
	)
	houseModel.position.setY(10)
	doorModel.position.setY(15 / 2)
	const houseBundle = modelColliderBundle(houseModel, RigidBodyType.Fixed)
	const doorBundle = modelColliderBundle(doorModel, RigidBodyType.Fixed)
	const house = ecs.add({
		npcName: 'Grandma',
		dialog: dialogs.GrandmasHouse(),
		dialogHeight: 4,
		position,
		...houseBundle,
		inMap: true,
	})

	ecs.add({
		parent: house,
		npcName: 'door',
		position: new Vector3(0, 0, -15),
		dialog: dialogs.GrandmasDoor(),
		...doorBundle,
		interactable: Interactable.Enter,
	})
}