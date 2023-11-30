import type { Collider, ColliderDesc, RigidBody, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import type { JSXElement } from 'solid-js'
import type { Group, Light, Mesh, Object3D, Object3DEventMap, PerspectiveCamera, Quaternion, Scene, Vector3, WebGLRenderer } from 'three'
import type CSM from 'three-csm'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import type { Animator } from './animator'
import type { PlayerInputMap } from '@/lib/inputs'
import type { direction } from '@/lib/directions'
import type { playerAnimations } from '@/constants/animations'

export enum Faction {
	Player,
	Enemy,
}

export interface Entity {
	// ! Models
	scale?: number
	// ! Transforms
	position?: Vector3
	worldPosition?: Vector3
	rotation?: Quaternion
	// ! Camera
	cameratarget?: true
	followCamera?: true
	mainCamera?: true
	// ! ThreeJS
	scene?: Scene
	renderer?: WebGLRenderer
	camera?: PerspectiveCamera
	controls?: OrbitControls
	light?: Light
	group?: Group
	model?: Object3D<Object3DEventMap>
	mesh?: Mesh
	composer?: EffectComposer
	csm?: CSM
	// ! Hierarchy
	parent?: Entity
	children?: Set<Entity>
	inMap?: true
	// ! InputMaps
	playerControls?: PlayerInputMap
	// ! Physics
	bodyDesc?: RigidBodyDesc
	body?: RigidBody
	colliderDesc?: ColliderDesc
	collider?: Collider
	// ! Animations
	playerAnimator?: Animator<playerAnimations>
	template?: () => JSXElement
	el?: HTMLElement
	cssObject?: true
	uiRoot?: true
	// ! Farming
	sensor?: true
	sensorCollider?: Collider
	// ! Game
	map?: true
	// ! Camp
	door?: { index: number; direction: direction }
	// ! Dungeon
	faction?: Faction
	test?: true
}
type Prettify<T> = {
	[K in keyof T]: T[K];
} & unknown

type KeysOfType<T, U> = {
	[K in keyof T]: T[K] extends U ? K : never;
}[keyof T]
export type ComponentsOfType<T> = Prettify<KeysOfType<Required<Entity>, T>> & keyof Entity
