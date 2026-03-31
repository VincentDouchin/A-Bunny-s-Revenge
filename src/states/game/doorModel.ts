import { color, float, smoothstep, uv } from 'three/tsl'
import { BoxGeometry, ConeGeometry, FrontSide, Group, Mesh, MeshBasicNodeMaterial, NodeMaterial, PlaneGeometry, SphereGeometry } from 'three/webgpu'

const doorSide = () => {
	const material = new NodeMaterial()
	material.side = FrontSide
	material.transparent = true

	material.colorNode = color(0, 0, 0)

	material.opacityNode = smoothstep(float(0), float(0.5), uv().x)

	const mesh = new Mesh(new PlaneGeometry(120, 80), material)
	mesh.material.depthWrite = false
	mesh.rotateX(-Math.PI / 2 - (Math.PI / 180) * 10)
	mesh.rotateZ(-Math.PI / 2)
	mesh.position.z = 10
	mesh.position.y = 15
	const doorBack = new Mesh(new PlaneGeometry(70, 30), new MeshBasicNodeMaterial({ color: 0x000000, side: FrontSide }))
	doorBack.position.set(0, 10, 70)
	const door = new Group()
	door.add(mesh)
	return door
}
const axis = (size = 5) => {
	const group = new Group()

	const arrowX = new Mesh(new ConeGeometry(0.5, size), new MeshBasicNodeMaterial({ color: 0xff0000 }))
	const arrowY = new Mesh(new ConeGeometry(0.5, size), new MeshBasicNodeMaterial({ color: 0x00ff00 }))
	const arrowZ = new Mesh(new ConeGeometry(0.5, size), new MeshBasicNodeMaterial({ color: 0x0000ff }))
	arrowX.position.set(0, 0, size)
	arrowY.position.set(0, size, 0)
	arrowZ.position.set(-size, 0, 0)
	arrowX.rotateX(Math.PI / 2)
	arrowY.rotateY(Math.PI / 2)
	arrowZ.rotateZ(Math.PI / 2)
	group.add(arrowX, arrowY, arrowZ)
	return group
}
const marker = () => {
	const marker = new Mesh(new SphereGeometry(3), new MeshBasicNodeMaterial())
	marker.add(axis())
	return marker
}
const boxGroup = () => {
	// Order: right, left, top, bottom, front, back
	const materials = [
		new MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 }), // right - white
		new MeshBasicNodeMaterial({ color: 0x00ff00, transparent: true, opacity: 0.2 }), // left - green (side)
		new MeshBasicNodeMaterial({ color: 0x0000ff, transparent: true, opacity: 0.2 }), // top - blue
		new MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 }), // bottom - white
		new MeshBasicNodeMaterial({ color: 0xff0000, transparent: true, opacity: 0.2 }), // front - yellow
		new MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 }), // back - white
	]
	const boxGroup = new Group()
	const box = new Mesh(new BoxGeometry(1, 1), materials)
	box.position.y = 0.5
	boxGroup.add(box)
	return boxGroup
}
export const customModels = (showMarkers: boolean) => {
	return {
		box: showMarkers ? boxGroup() : new Group(),
		marker: showMarkers ? marker() : new Group(),
		door: doorSide(),
	}
}
