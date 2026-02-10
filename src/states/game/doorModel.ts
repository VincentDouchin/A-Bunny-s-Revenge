import { BoxGeometry, ConeGeometry, FrontSide, Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, ShaderMaterial, SphereGeometry } from 'three'
import vertexShader from '@/shaders/glsl/main.vert?raw'

const doorSide = () => {
	const mesh = new Mesh(
		new PlaneGeometry(120, 80),
		new ShaderMaterial({
			side: FrontSide,
			transparent: true,
			vertexShader,
			fragmentShader: /* glsl */`
			varying vec2 vUv;
			void main(){
				gl_FragColor = vec4(0.,0.,0.,smoothstep(0.,0.8,vUv.x));
			}
		`,
		}),
	)
	mesh.material.depthWrite = false
	mesh.rotateX(-Math.PI / 2 - Math.PI / 180 * 10)
	mesh.rotateZ(-Math.PI / 2)
	mesh.position.z = 10
	mesh.position.y = 15
	const doorBack = new Mesh(
		new PlaneGeometry(70, 30),
		new MeshBasicMaterial({ color: 0x000000, side: FrontSide }),
	)
	doorBack.position.set(0, 10, 70)
	const door = new Group()
	door.add(mesh)
	return door
}
const marker = () => {
	const marker = new Mesh(new SphereGeometry(3), new MeshBasicMaterial())
	const arrow = new Mesh(new ConeGeometry(2, 5), new MeshBasicMaterial({ color: 0xFF0000 }))
	arrow.position.set(0, 0, 3)
	arrow.rotateX(Math.PI / 2)
	marker.add(arrow)
	return marker
}
const boxGroup = () => {
	const boxGroup = new Group()
	const box = new Mesh(new BoxGeometry(1, 1), new MeshBasicMaterial({ color: 0xFF0000, transparent: true, opacity: 0.5 }))
	box.position.y = 0.5
	boxGroup.add(box)
	return boxGroup
}
export const customModels = (showMarkers: boolean) => {
	return {
		box: showMarkers ? boxGroup() : new Object3D(),
		marker: showMarkers ? marker() : new Object3D(),
		door: doorSide(),
	}
}