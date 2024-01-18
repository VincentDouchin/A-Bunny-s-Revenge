import { BoxGeometry, Mesh, MeshBasicMaterial } from 'three'
import { ecs } from '@/global/init'

export const addDebugCollider = () => ecs.with('debugCollider', 'size', 'group').without('debugColliderMesh').onEntityAdded.subscribe((entity) => {
	const size = entity.size
	const box = new Mesh(
		new BoxGeometry(size.x, size.y, size.z),
		new MeshBasicMaterial({ color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, opacity: 0.5, transparent: true }),
	)
	// const controls = new TransformControls(camera, renderer.domElement)
	// controls.attach(box)
	// scene.add(controls)
	entity.group.add(box)
	box.position.y = size.y / 2
	ecs.addComponent(entity, 'debugColliderMesh', box)
})