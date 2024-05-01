import type { items, weapons } from '@assets/assets'
import type { Collider, ColliderDesc, KinematicCharacterController, RigidBody, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import type { With } from 'miniplex'
import type { JSXElement } from 'solid-js'
import type { BufferGeometry, Camera, Group, Light, Mesh, MeshPhongMaterial, Object3D, Object3DEventMap, Quaternion, Scene, ShaderMaterial, Sprite, Vector3, WebGLRenderer } from 'three'
import type { BatchedRenderer, ParticleEmitter } from 'three.quarks'
import type { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import type { Animator } from './animator'
import type { InstanceHandle } from './assetLoaders'
import type { NPC } from '@/constants/NPC'
import type { Drop, enemy } from '@/constants/enemies'
import type { Item } from '@/constants/items'
import type { Recipe } from '@/constants/recipes'
import type { MenuInputMap, PlayerInputMap } from '@/global/inputMaps'
import type { direction } from '@/lib/directions'
import type { NavGrid } from '@/lib/navGrid'
import type { State } from '@/lib/state'
import type { Modifier, Stat } from '@/lib/stats'
import type { Timer } from '@/lib/timer'
import type { WeaponArc } from '@/shaders/weaponArc'
import type { Room } from '@/states/dungeon/generateDungeon'
import type { Dash } from '@/states/game/dash'
import type { MenuOptions, RenderMainMenuFn } from '@/states/mainMenu/mainMenuRendering'

export type PlayerAnimations = 'idle' | 'running' | 'lightAttack' | 'slashAttack' | 'heavyAttack' | 'hit'
export type EnemyAnimations = 'idle' | 'running' | 'attacking' | 'hit' | 'dead'
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
	FillWateringCan = 'fill watering can',
	Water = 'water',
	Buy = 'buy',
}
export enum MenuType {
	Oven,
	Bench,
	BenchGame,
	Cauldron,
	Chest,
	Player,
	Quest,
	OvenMinigame,
	CauldronGame,
	SelectSeed,
	Basket,
}
export enum RenderGroup {
	MainMenu,
	Game,
}
export enum EnemyAttackStyle {
	Charging,
	Range,
	Melee,
	Jumping,
	BeeBoss,
}
export interface States {
	basket: 'idle' | 'running'
	player: 'idle' | 'running' | 'attack' | 'dying' | 'dead' | 'picking' | 'dash' | 'hit' | 'stun' | 'poisoned'
	enemy: 'idle' | 'running' | 'attack' | 'hit' | 'dying' | 'dead' | 'waitingAttack' | 'attackCooldown' | 'stun' | 'wander'
	boss: 'idle' | 'running' | 'rangeAttack' | 'attack' | 'dying' | 'dead' | 'waitingAttack' | 'attackCooldown' | 'hit'
}
export const cropNames = ['carrot', 'beet', 'tomato', 'lettuce', 'pumpkin', 'wheat'] as const
export const fruitNames = ['apple'] as const
export type crops = (typeof cropNames)[number]
export type fruits = (typeof fruitNames)[number]
export interface Entity {
	// ! Rendering
	renderGroup?: RenderGroup
	// ! Models
	scale?: number
	// ! Transforms
	movementForce?: Vector3
	targetMovementForce?: Vector3
	acceleration?: number
	speed?: Stat
	position?: Vector3
	worldPosition?: Vector3
	rotation?: Quaternion
	targetRotation?: Quaternion
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
	light?: Light
	group?: Group
	model?: Object3D<Object3DEventMap>
	// ! Hierarchy
	parent?: Entity
	children?: Set<Entity>
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
	// ! Behaviors
	behaviorController?: keyof States
	// ! Animations
	playerAnimator?: Animator<PlayerAnimations>
	basketAnimator?: Animator<Animations['Basket']>
	enemyAnimator?: Animator<EnemyAnimations>
	ovenAnimator?: Animator<Animations['BunnyOvenPacked']>
	houseAnimator?: Animator<Animations['House']>
	chestAnimator?: Animator<Animations['Chest']>
	template?: () => JSXElement
	el?: HTMLElement
	cssObject?: true
	uiRoot?: true
	// ! Farming
	sensorDesc?: ColliderDesc
	sensorCollider?: Collider
	crop?: { stage: number, name: crops, watered: boolean, luck: number, planted: number }
	plantableSpot?: string
	planted?: With<Entity, 'crop'>
	wateringCan?: With<Entity, 'model' | 'waterAmount'>
	waterAmount?: number
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
	doorLocked?: true
	tree?: true
	obstacle?: true
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
	groundLevel?: number
	bounce?: { amount: number, force: Vector3, touchedGround: boolean }
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
	dialogContainer?: CSS2DObject
	// ! Health
	currentHealth?: number
	maxHealth?: Stat

	// ! Enemies
	enemyName?: enemy
	drops?: Drop[]
	healthBar?: true
	healthBarContainer?: CSS2DObject
	boss?: true
	projectile?: true
	archingProjectile?: Vector3
	honeyProjectile?: true
	honeySpot?: Modifier<'speed'>
	deathTimer?: Timer<false>
	attackPattern?: 'melee' | 'distance'
	attackStyle?: EnemyAttackStyle
	sneeze?: Timer<false>
	poisoned?: Timer<false>
	pollen?: true
	// ! AI
	navGrid?: NavGrid
	// ! Particles
	emitter?: ParticleEmitter<Object3DEventMap>
	autoDestroy?: true
	// ! Stats
	strength?: Stat
	critChance?: Stat
	critDamage?: Stat
	attackSpeed?: Stat
	lootQuantity?: Stat
	lootChance?: Stat
	// ! Level Editor
	entityId?: string
	// ! FSM
	state?: States[keyof States]
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
	withTimeUniform?: true
	// ! Basket
	basket?: With<Entity, 'inventory' | 'inventoryId' | 'inventorySize'>
	following?: boolean
	followTarget?: With<Entity, 'position'>
	// ! Weapon
	weapon?: With<Entity, 'model' | 'weaponName' | 'weaponArc'>
	weaponArc?: WeaponArc
	weaponName?: weapons
	weaponStand?: weapons
	// ! Main menu
	menuSelected?: MenuOptions
	menuTexture?: RenderMainMenuFn
	windowShader?: ShaderMaterial
	stateEntity?: State
	menuButton?: MenuOptions
	// ! Money
	acorn?: true
	// ! Berry Bush
	berries?: Set<Mesh<BufferGeometry, MeshPhongMaterial>>
	dash?: Dash
	dashDisplay?: Sprite
	// ! Stun
	stun?: Group
	hitTimer?: Timer<true>
	// ! Wander
	wander?: { target: Vector3, cooldown: Timer<false> }
	// ! Debuffs
	debuffsContainer?: CSS2DObject
	// ! Trail
	trailMaker?: true
	trail?: { origin: Entity, timer: Timer<false> }
	poison?: true
	// ! Stall
	price?: number

}
export type Bundle<C extends keyof Entity> = () => With<Entity, C>

type KeysOfType<T, U> = {
	[K in keyof T]: T[K] extends U ? K : never;
}[keyof T]
export type ComponentsOfType<T> = KeysOfType<Required<Entity>, T>
