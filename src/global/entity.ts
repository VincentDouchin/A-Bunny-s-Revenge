import type { items } from '@assets/assets'
import type { Collider, ColliderDesc, RigidBody, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import type { Tween } from '@tweenjs/tween.js'
import type { With } from 'miniplex'
import type { JSXElement } from 'solid-js'
import type { Group, Light, Mesh, MeshPhongMaterial, Object3D, Object3DEventMap, PerspectiveCamera, Quaternion, Scene, Vector3, WebGLRenderer } from 'three'
import type { BatchedRenderer, ParticleEmitter } from 'three.quarks'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import type { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import type { Animator } from './animator'
import type { InstanceHandle } from './assetLoaders'
import type { Stat } from '@/lib/stats'
import type { StateMachine } from '@/lib/stateMachine'
import type { direction } from '@/lib/directions'
import type { MenuInputMap, PlayerInputMap } from '@/global/inputMaps'
import type { Recipe } from '@/constants/recipes'
import type { Item } from '@/constants/items'
import type { NPC } from '@/constants/NPC'

export type Dialog = Generator<string | string[] | void | false, void, number | void>
export enum Faction {
	Player,
	Enemy,
}
export enum Interactable {
	Talk = 'talk',
	Plant = 'plant',
	Harvest = 'harvest',
	Enter = 'enter',
	Cauldron = 'cauldron',
	Cook = 'cook',
	Chop = 'chop',
	SelectSeed = 'select seed',
	Open = 'open',
	BulletinBoard = 'quests',
}
export enum MenuType {
	Oven,
	Cauldron,
	Chest,
	Player,
	Quest,
	OvenMinigame,
	CauldronGame,
	SelectSeed,
}
export const cropNames = ['carrot', 'beet', 'tomato', 'lettuce'] as const

export type crops = (typeof cropNames)[number]
export interface Entity {
	// ! Tween
	tween?: Tween<any>
	// ! Models
	scale?: number
	// ! Transforms
	movementForce?: Vector3
	speed?: number
	position?: Vector3
	worldPosition?: Vector3
	rotation?: Quaternion
	// ! Camera
	cameratarget?: true
	initialCameratarget?: true
	followCamera?: true
	mainCamera?: true
	cameraLookat?: Vector3
	cameraOffset?: Vector3
	// ! ThreeJS
	scene?: Scene
	renderer?: WebGLRenderer
	batchRenderer?: BatchedRenderer
	camera?: PerspectiveCamera
	controls?: OrbitControls
	light?: Light
	group?: Group
	model?: Object3D<Object3DEventMap>
	mesh?: Mesh
	composer?: EffectComposer
	// ! Hierarchy
	parent?: Entity
	children?: Set<Entity>
	inMap?: true
	withChildren?: (parent: Entity) => void
	// ! InputMaps
	playerControls?: PlayerInputMap
	menuInputs?: MenuInputMap
	// ! Physics
	bodyDesc?: RigidBodyDesc
	body?: RigidBody
	colliderDesc?: ColliderDesc
	collider?: Collider
	size?: Vector3
	// ! Animations
	playerAnimator?: Animator<Animations['BunnydAnim']>
	beeAnimator?: Animator<Animations['Armabee']>
	shagaAnimator?: Animator<Animations['Shaga_A']>
	pandaAnimator?: Animator<Animations['Panda']>
	ovenAnimator?: Animator<Animations['BunnyOvenPacked']>
	chestAnimator?: Animator<Animations['Chest']>
	template?: () => JSXElement
	el?: HTMLElement
	cssObject?: true
	uiRoot?: true
	// ! Farming
	sensor?: true
	sensorCollider?: Collider
	crop?: { stage: number, name: crops }
	plantableSpot?: string
	planted?: With<Entity, 'crop'>
	// ! Game
	map?: string
	ground?: true
	interacting?: true
	interactable?: Interactable
	interactionContainer?: CSS2DObject
	onPrimary?: (entity: Entity, player: Entity) => void
	onSecondary?: (entity: Entity, player: Entity) => void
	outline?: With<Entity, 'model'>
	// ! Camp
	door?: direction
	tree?: true
	grass?: true
	instanceHandle?: InstanceHandle
	// ! Dungeon
	faction?: Faction
	ignoreDoor?: direction
	// ! Items
	item?: true
	itemLabel?: items
	popDirection?: Vector3
	// ! Inventory
	inventory?: (Item | null)[]
	inventorySize?: number
	menuType?: MenuType
	inventoryId?: string
	// ! Cooking
	displayedItem?: Entity
	// ! Player
	player?: true
	// ! NPC
	npc?: true
	npcName?: (typeof NPC)[number]
	// ! Dialog
	dialog?: Dialog
	dialogHeight?: number
	activeDialog?: true
	currentDialog?: string | string[]
	dialogContainer?: CSS2DObject
	// ! Health
	currentHealth?: number
	maxHealth?: Stat

	// ! Enemies
	drops?: Item[]
	// ! Particles
	emitter?: ParticleEmitter<Object3DEventMap>
	autoDestroy?: true
	// ! Stats
	strength?: Stat
	// ! Level Editor
	entityId?: string
	// ! FSM
	stateMachine?: StateMachine<states>
	state?: states
	// ! Minigame
	recipesQueued?: Recipe[]
	oven?: With<Entity, 'recipesQueued' | 'model'>
	minigameContainer?: CSS2DObject
	spoon?: Entity
	// ! Sounds
	lastStep?: { left: boolean, right: boolean }
	// ! DayNight
	nightLight?: Light
	emissiveMat?: MeshPhongMaterial
	ambientLight?: 'night' | 'day'
}
export type states = 'idle' | 'running' | 'picking' | 'dying' | 'hit' | 'hello' | 'dead' | 'waitingAttack' | 'attacking' | 'attackCooldown' | 'doorOpening' | 'doorClosing'
export type Bundle<C extends keyof Entity> = () => With<Entity, C>

type KeysOfType<T, U> = {
	[K in keyof T]: T[K] extends U ? K : never;
}[keyof T]
export type ComponentsOfType<T> = KeysOfType<Required<Entity>, T>
