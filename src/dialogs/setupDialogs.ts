import type { Animations } from '@assets/animations'
import { AmbientLight, Euler, Group, Mesh, MeshBasicMaterial, OrthographicCamera, PerspectiveCamera, Quaternion, Scene, SphereGeometry, Vector3, WebGLRenderer } from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { degToRad } from 'three/src/math/MathUtils'
import { Animator } from '@/global/animator'
import { RenderGroup } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { inMap } from '@/lib/hierarchy'
import { traverseFind } from '@/lib/models'
import { speaker } from '@/utils/dialogHelpers'

export const setupDialogs = () => {
	const dist = 10
	const minion1Model = clone(assets.characters.Gloom.scene)
	minion1Model.scale.setScalar(10)
	ecs.add({
		model: minion1Model,
		position: new Vector3(dist, 0, 0),
		worldPosition: new Vector3(dist, 0, 0),
		...inMap(),
		rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), degToRad(-90)),
		npcName: 'Gloom',
	})
	const minion2Model = clone(assets.characters.JACK_animated.scene)
	minion2Model.scale.setScalar(10)
	minion2Model.traverse(obj => obj.name === 'Weapon' && (obj.visible = false))
	ecs.add({
		cameraTarget: true,
		worldPosition: new Vector3(),
	})
	const jack = ecs.add({
		model: minion2Model,
		kayAnimator: new Animator<Animations['JACK_animated']>(minion2Model, assets.characters.JACK_animated.animations),
		position: new Vector3(-dist, 0, 0),
		worldPosition: new Vector3(-dist, 0, 0),
		...inMap(),
		rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), degToRad(90)),
	})
	jack.kayAnimator.playAnimation('Idle')
	// const dialog = function* () {
	// 	speaker('Gloom')
	// 	yield 'I wanted to take a nap. I wonder why he chose us for this mission.'
	// }
	// ecs.add({ dialog: dialog() })
	const scene = new Scene()

	const dialogRenderGroup = ecs.add({
		renderGroup: RenderGroup.Dialog,
		scene,
		renderer: new WebGLRenderer({ alpha: true }),
	})
	// const camera = new PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.01, 100)
	const ratio = 300
	const camera = new OrthographicCamera(
		-window.innerWidth / ratio,
		window.innerWidth / ratio,
		window.innerHeight / ratio,
		-window.innerHeight / ratio,
	)
	ecs.add({
		camera,
		position: new Vector3(0, 0, 15),
		cameraOffset: new Vector3(),
		parent: dialogRenderGroup,
		renderGroup: RenderGroup.Dialog,
	})

	camera.lookAt(new Vector3(0, 0, 0))
	scene.add(new AmbientLight())
	const minion1 = clone(assets.characters.Gloom.scene)
	minion1.scale.setScalar(2.2)
	minion1.rotateY(degToRad(55))
	minion1.position.set(-3, -2, 0)
	scene.add(minion1)
	const minion2 = clone(assets.characters.JACK_animated.scene)
	const animator = new Animator<Animations['JACK_animated']>(minion2, assets.characters.JACK_animated.animations)
	animator.init('Idle')
	minion2.traverse(obj => obj.name === 'Weapon' && (obj.visible = false))
	minion2.rotateY(degToRad(-55))
	minion2.scale.setScalar(2.2)
	minion2.position.set(3, -2, 0)
	scene.add(minion2)
}