import type { items, weapons } from '@assets/assets'
import type { Collider, ColliderDesc, KinematicCharacterController, RigidBody, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import type { Tween } from '@tweenjs/tween.js'
import type { With } from 'miniplex'
import type { JSXElement } from 'solid-js'
import type { Camera, Group, Light, Mesh, MeshPhongMaterial, Object3D, Object3DEventMap, Quaternion, Scene, Vector3, WebGLRenderer } from 'three'
import type { BatchedRenderer, ParticleEmitter } from 'three.quarks'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import type { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import type { Animator } from './animator'
import type { InstanceHandle } from './assetLoaders'
import type { Room } from '@/states/dungeon/generateDungeon'
import type { Stat } from '@/lib/stats'
import type { StateMachine } from '@/lib/stateMachine'
import type { direction } from '@/lib/directions'
import type { MenuInputMap, PlayerInputMap } from '@/global/inputMaps'
import type { Recipe } from '@/constants/recipes'
import type { Item } from '@/constants/items'
import type { enemy } from '@/constants/enemies'
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
	Oven = 'oven',
	Chop = 'chop',
	SelectSeed = 'select seed',
	Open = 'open',
	BulletinBoard = 'quests',
	WeaponStand = 'weaponStand',
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
	Basket,
}
export const cropNames = ['carrot', 'beet', 'tomato', 'lettuce', 'pumpkin', 'wheat'] as const
export const fruitNames = ['apple'] as const
export type crops = (typeof cropNames)[number]
export type fruits = (typeof fruitNames)[number]
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
	cameraShake?: Vector3
	initialCameratarget?: true
	followCamera?: true
	mainCamera?: true
	cameraLookat?: Vector3
	cameraOffset?: Vector3
	lockX?: boolean
	// ! ThreeJS
	scene?: Scene
	renderer?: WebGLRenderer
	batchRenderer?: BatchedRenderer
	camera?: Camera
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
	controller?: KinematicCharacterController
	// ! Animations
	playerAnimator?: Animator<Animations['Bunny']>
	beeAnimator?: Animator<Animations['Armabee']>
	beeBossAnimator?: Animator<Animations['Armabee_Evolved']>
	shagaAnimator?: Animator<Animations['Shaga_A']>
	ovenAnimator?: Animator<Animations['BunnyOvenPacked']>
	chestAnimator?: Animator<Animations['Chest']>
	houseAnimator?: Animator<Animations['House']>
	basketAnimator?: Animator<Animations['Basket']>
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
	doorLevel?: number
	tree?: true
	grass?: true
	instanceHandle?: InstanceHandle
	// ! Dungeon
	dungeon?: Room
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
	combo?: {
		lastAttack: number
		heavyAttack: number
	}
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
	enemyName?: enemy
	drops?: Item[]
	healthBar?: true
	healthBarContainer?: CSS2DObject
	boss?: true
	projectile?: true
	deathTimer?: number
	// ! Particles
	emitter?: ParticleEmitter<Object3DEventMap>
	autoDestroy?: true
	// ! Stats
	strength?: Stat
	critChance?: Stat
	critDamage?: Stat
	// ! Level Editor
	entityId?: string
	// ! FSM
	stateMachine?: StateMachine<states>
	state?: states
	// ! Minigame
	recipesQueued?: Recipe[]
	minigameContainer?: CSS2DObject
	spoon?: Entity
	// ! Sounds
	lastStep?: { left: boolean, right: boolean }
	// ! DayNight
	nightLight?: Light
	emissiveMat?: MeshPhongMaterial
	ambientLight?: 'night' | 'day'
	firefly?: true

	withTimeUniform?: true
	// ! Basket
	basket?: With<Entity, 'inventory' | 'inventoryId' | 'inventorySize'>
	following?: boolean
	followTarget?: With<Entity, 'position'>
	// ! Weapon
	weapon?: With<Entity, 'model' | 'weaponName'>
	weaponName?: weapons
	weaponStand?: weapons

}
export type states = 'idle' | 'running' | 'picking' | 'dying' | 'hit' | 'hello' | 'dead' | 'waitingAttack' | 'attacking' | 'attackCooldown' | 'doorOpening' | 'doorClosing'
export type Bundle<C extends keyof Entity> = () => With<Entity, C>

type KeysOfType<T, U> = {
	[K in keyof T]: T[K] extends U ? K : never;
}[keyof T]
export type ComponentsOfType<T> = KeysOfType<Required<Entity>, T>
