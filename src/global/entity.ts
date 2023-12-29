import type { Collider, ColliderDesc, RigidBody, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import type { Tween } from '@tweenjs/tween.js'
import type { With } from 'miniplex'
import type { JSXElement } from 'solid-js'
import type { Group, Light, Mesh, Object3D, Object3DEventMap, PerspectiveCamera, Quaternion, Scene, Vector3, WebGLRenderer } from 'three'
import type CSM from 'three-csm'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import type { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import type { Animator } from './animator'
import type { TweenGroup } from '@/lib/tweenGroup'
import type { MenuInputMap, PlayerInputMap } from '@/lib/inputs'
import type { direction } from '@/lib/directions'
import type { ItemData } from '@/constants/items'
import type { NPC } from '@/constants/NPC'

export type Dialog = Generator<string | string[] | void | false, void, number | void>
export enum Faction {
	Player,
	Enemy,
}
export type InventoryTypes = 'oven' | 'cuttingBoard'
export type crops = 'carrot' | 'beet' | 'mushroom'
export interface Entity {
	// ! Tween
	tween?: Tween<any> | TweenGroup
	// ! Models
	scale?: number
	// ! Transforms
	movementForce?: Vector3
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
	menuInputs?: MenuInputMap
	// ! Physics
	bodyDesc?: RigidBodyDesc
	body?: RigidBody
	colliderDesc?: ColliderDesc
	collider?: Collider
	size?: Vector3
	debugCollider?: true
	debugColliderMesh?: Mesh
	// ! Animations
	playerAnimator?: Animator<string>
	template?: () => JSXElement
	el?: HTMLElement
	cssObject?: true
	uiRoot?: true
	// ! Farming
	sensor?: true
	sensorCollider?: Collider
	crop?: { stage: number, name: crops }
	// ! Game
	map?: true
	interactable?: true
	outline?: With<Entity, 'model'>
	// ! Camp
	door?: { to: number, direction: direction }
	// ! Dungeon
	faction?: Faction
	ignoreDoor?: direction
	// ! Items
	item?: true
	itemLabel?: items
	// ! Inventory
	inventory?: (ItemData | null)[]
	inventorySize?: number
	openInventory?: true
	inventoryType?: InventoryTypes
	// ! Cooking
	displayedItem?: Entity
	// ! Player
	player?: true
	// ! NPC
	npc?: true
	npcName?: (typeof NPC)[number]
	// ! Dialog
	dialog?: Dialog
	activeDialog?: true
	currentDialog?: string | string[]
	dialogContainer?: CSS2DObject
}
export type Bundle<C extends keyof Entity> = () => With<Entity, C>
type Prettify<T> = {
	[K in keyof T]: T[K];
} & unknown

type KeysOfType<T, U> = {
	[K in keyof T]: T[K] extends U ? K : never;
}[keyof T]
export type ComponentsOfType<T> = Prettify<KeysOfType<Required<Entity>, T>> & keyof Entity
