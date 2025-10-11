import { Color, Mesh, MeshPhongMaterial, PlaneGeometry } from 'three'
import { addUniform, extendMaterial, MaterialExtension, replace, unpack } from '@/lib/materialExtension'

const godRayExtension = new MaterialExtension({ color: new Color(0xF7F3B7) })
	.defines('USE_UV')
	.frag(
		unpack('opaque_fragment'),
		addUniform('color', 'vec3'),
		replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );',	/* glsl */`
		float opacity = smoothstep(50.,15.,abs(vViewPosition.x));
		gl_FragColor = vec4(color, (0.5 - abs(vUv.y -0.5) * 1.2) * opacity);
	`),
	)

const GodRayMaterial = extendMaterial(MeshPhongMaterial, [godRayExtension], { debug: 'fragment' })

export const godRay = () => {
	const height = 100
	const ray = new Mesh(
		new PlaneGeometry(10, height),
		new GodRayMaterial({ transparent: true, depthWrite: false }),
	)

	ray.rotateY(Math.PI)
	ray.rotateZ(Math.PI / 5)
	ray.position.set(0, height / 2, 0)
	ray.renderOrder = 999
	return ray
}
export const spawnGodRay = () => {
	// ecs.add({ model: godRay(), position: new Vector3(20, 0, 0), ...inMap() })
	// ecs.add({ model: godRay(), position: new Vector3(), ...inMap() })
	// ecs.add({ model: godRay(), position: new Vector3(-20, 0, 0), ...inMap() })
}