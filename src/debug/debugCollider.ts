import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import { ecs } from '@/global/init'

const debugColliderQuery = ecs.with('debugCollider', 'size', 'collider', 'body', 'worldPosition', 'group').without('debugColliderMesh')
const addDebugCollider = () => debugColliderQuery.onEntityAdded.subscribe((entity) => {
	const size = entity.size
	const box = new Mesh(
		new BoxGeometry(size.x, size.y, size.z),
		new MeshBasicMaterial({ color: `red`, opacity: 0.5, transparent: true }),
	)
	const collider = entity.collider.translation()
	const posC = new Vector3(collider.x, collider.y, collider.z).roundToZero()
	box.position.set(...posC.sub(entity.worldPosition).toArray())

	ecs.addComponent(entity, 'debugColliderMesh', box)
})
const removeDebugCollider = () => ecs.with('debugColliderMesh', 'group').without('debugCollider').onEntityAdded.subscribe((e) => {
	setTimeout(() => ecs.removeComponent(e, 'debugColliderMesh'), 1)
})

export const updateDebugColliders = [addDebugCollider, removeDebugCollider]