import type { items, voices, weapons } from '@assets/assets'
import type { Collider, ColliderDesc, KinematicCharacterController, RigidBody, RigidBodyDesc, Shape } from '@dimforge/rapier3d-compat'
import type { Query, With } from 'miniplex'
import type { BufferGeometry, Camera, Group, Light, Mesh, MeshPhongMaterial, Object3D, Object3DEventMap, Quaternion, Scene, ShaderMaterial, Sprite, Vector3, WebGLRenderer } from 'three'
import type { BatchedRenderer, ParticleEmitter, ParticleSystem } from 'three.quarks'
import type { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import type { RequiredKeysOf } from 'type-fest'
import type { Animator } from './animator'
import type { InstanceHandle } from './assetLoaders'
import type { ModifierContainer } from './modifiers'
import type { app } from './states'
import type { Drop } from '@/constants/enemies'
import type { crops, Item } from '@/constants/items'
import type { NPC } from '@/constants/NPC'
import type { Quest2 } from '@/constants/quests'
import type { Recipe } from '@/constants/recipes'
import type { MenuInputMap, PlayerInputMap } from '@/global/inputMaps'
import type { AppStates } from '@/lib/app'
import type { Direction } from '@/lib/directions'
import type { MeshLine, MeshLineMaterial } from '@/lib/MeshLine'
import type { Stat } from '@/lib/stats'
import type { Timer } from '@/lib/timer'
import type { WeaponArc } from '@/shaders/weaponArc'
import type { Room } from '@/states/dungeon/generateDungeon'
import type { Dash } from '@/states/game/dash'
import type { MainMenuBook } from '@/states/mainMenu/book'

export type PlayerAnimations = 'idle' | 'runFront' | 'runLeft' | 'runRight' | 'runBack' | 'lightAttack' | 'slashAttack' | 'heavyAttack' | 'hit' | 'fishing' | 'sleeping' | 'wakeUp' | 'interact' | 'pickup' | 'dashFront' | 'dashLeft' | 'dashRight' | 'dashBack' | 'dead'
export type EnemyAnimations = 'idle' | 'running' | 'attacking' | 'hit' | 'dead'
export type PumpkinSeedAnimations = EnemyAnimations | 'spawn'
export type PumpkinBossAnimations = EnemyAnimations | 'spawn' | 'summon'
export type Dialog = Generator<string | void, void, void> | AsyncGenerator<string | void, void, void>
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
	MagicBean = 'Plant magic bean',
	Fishing = 'use fishing pole',
	Read = 'read',
	PickUp = 'pick up',
}
export enum MenuType {
	Oven,
	Bench,
	BenchGame,
	Cauldron,
	Chest,
	Player,
	Quest,
	OvenMiniGame,
	CauldronGame,
	SelectSeed,
	Basket,
	Fishing,
}
export enum RenderGroup {
	MainMenu,
	Game,
}

export const actors = ['cellarDoor', 'houseDoor', 'playerIntro', 'basketIntro', 'intro', 'cellarStairs', 'oven', 'cookingPot', 'blanket'] as const
export const farmDoors = ['intro', 'cellar', 'clearing', 'village', 'fromVillage'] as const
export type Doors = typeof farmDoors[number] | Direction
export type Actor = (typeof actors)[number]

export const assertEntity = <C extends keyof Entity>(e: Entity, ...components: C[]) => {
	for (const component of components) {
		if (!(component in e)) {
			throw new Error(`component ${component} not found on entity`)
		}
	}
	return e as With<Entity, C>
}

const baseEnemyStates = ['idle', 'running', 'attack', 'hit', 'dying', 'dead', 'waitingAttack', 'attackCooldown'] as const

export const States = {
	basket: ['idle', 'running'],
	player: ['idle', 'running', 'attack0', 'attack1', 'attack2', 'dying', 'dead', 'picking', 'dash', 'hit', 'stun', 'poisoned', 'managed'],
	enemy: [...baseEnemyStates, 'stun'],
	beeBoos: [...baseEnemyStates, 'rangeAttack'],
	pumpkinSeed: [...baseEnemyStates, 'spawn'],
	pumpkinBoss: [...baseEnemyStates, 'summon', 'underground', 'rangeAttack'],
	fish: ['going', 'hooked', 'wander', 'bounce', 'runaway'],
} as const

export const states = <S extends ReadonlyArray<AllStates>>(states: S): (`${S[number]}State` & keyof Entity)[] => states.map(s => `${s}State` as const)
export type AllStates = typeof States[keyof typeof States][number]
export type StateComponents = { [K in AllStates as `${K}State`]?: true }
export const stateBundle = <A extends AllStates>(states: ReadonlyArray<A>, defaultState: NoInfer<A>): With<Entity, 'state'> => {
	const components = states.reduce<StateComponents>((acc, v) => ({ ...acc, [`${v}State`]: true }), {})
	return {
		state: { current: defaultState, previous: null, next: null },
		...components,
	}
}

export interface Crop {
	stage: number
	name: crops
	watered: boolean
	luck: number
	planted: number
}

export interface AttackStyle {
	playerAttackStyle: { justEntered: boolean, lastAttack: number, heavyAttack: number }
	melee: true
	jumping: true
	spore: true
	beeBoss: true
	pumpkinBoss: { summonTimer: Timer<false> }
	charging: { amount: number, max: number }
	range: { amount: number, max: number }
	pumpkinSeed: true
}

export type AllAnimators = { [K in keyof Required<Entity>]: Required<Entity>[K] extends Animator ? K : never }[keyof Entity]

export type AllAnimations = { [K in keyof Entity]: Required<Entity>[K] extends Animator<infer A> ? A : never }[keyof Entity] & string
export type AnimatorsWith<A extends AllAnimations> = { [K in keyof Required<Entity>]: Required<Entity>[K] extends Animator<infer B> ? A extends B ? Required<Entity>[K] : Animator<any> : Animator<any> }[keyof Entity]

export class State<K extends string> {
	current: K
	previous: K | null = null
	next: K | null = null
	constructor(defaultState: K) {
		this.current = defaultState
	}
}

export type Entity = StateComponents & Partial<AttackStyle> & {
	state?: { current: AllStates, previous: AllStates | null, next: AllStates | null }
	wait?: { state: AllStates, duration: number }
	playerAnimator?: Animator<PlayerAnimations>
	// ! BehaviorTree
	// state?: { current: AllStates, previous: AllStates | null, next: AllStates | null }
	// ! Rendering
	renderGroup?: RenderGroup
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
	cameraTarget?: true
	cameraShake?: Vector3
	initialCameraTarget?: true
	followCamera?: true
	fixedCamera?: true
	mainCamera?: true
	cameraLookAt?: Vector3
	cameraOffset?: Vector3
	cameraLerp?: Vector3
	lockX?: boolean
	// ! ThreeJS
	scene?: Scene
	renderer?: WebGLRenderer
	batchRenderer?: BatchedRenderer
	camera?: Camera
	light?: Light
	group?: Group
	model?: Object3D
	outline?: true
	// ! Hierarchy
	parent?: Entity
	children?: Set<Entity>
	withChildren?: (parent: Entity) => void
	onDestroy?: () => void
	// ! InputMaps
	playerControls?: PlayerInputMap
	menuInputs?: MenuInputMap
	// ! Physics
	bodyDesc?: RigidBodyDesc
	body?: RigidBody
	colliderDesc?: ColliderDesc
	collider?: Collider
	secondaryCollidersDesc?: ColliderDesc[]
	secondaryColliders?: Collider[]
	directedDynamic?: true
	size?: Vector3
	controller?: KinematicCharacterController
	// ! Behaviors
	// behaviorController?: keyof States
	// ! Animations
	animator?: Animator<Animations['explode']>
	explodeAnimator?: Animator<Animations['explode']>
	basketAnimator?: Animator<Animations['Basket']>
	enemyAnimator?: Animator<EnemyAnimations>
	pumpkinBossAnimator?: Animator<PumpkinBossAnimations>
	ovenAnimator?: Animator<Animations['BunnyOvenPacked']>
	houseAnimator?: Animator<Animations['House']>
	chestAnimator?: Animator<Animations['Chest']>
	kayAnimator?: Animator<Animations['ALICE_animated']>
	cellarDoorAnimator?: Animator<Animations['cellar_entrance']>
	pumpkinSeedAnimator?: Animator<PumpkinSeedAnimations>
	// ! Farming
	sensor?: { shape: Shape, distance: number }
	crop?: Crop
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
	// ! Camp
	door?: Direction | (typeof farmDoors)[number]
	boundary?: Direction
	doorType?: 'vine' | 'fog' | 'marker'
	doorLevel?: number
	doorLocked?: true
	unlocked?: true
	tree?: true
	obstacle?: true
	grass?: true
	instanceHandle?: InstanceHandle
	// ! Dungeon
	dungeon?: Room
	faction?: Faction
	ignoreDoor?: Direction
	// ! Items
	item?: true
	itemLabel?: items
	collecting?: true
	recipe?: items
	health?: number
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
	// ! NPC
	npc?: true
	voice?: voices
	npcName?: (typeof NPC)[number]
	questMarker?: { quest: Quest2<any, any, any>, step: string }[]
	questMarkerContainer?: Group
	questMarkerPosition?: Vector3
	actor?: Actor
	// ! Dialog
	dialogHeight?: number
	dialog?: Dialog
	dialogContainer?: CSS2DObject
	// ! Health
	currentHealth?: number
	maxHealth?: Stat

	// ! Enemies
	inactive?: Timer<false>
	healthBar?: true
	healthBarContainer?: CSS2DObject
	boss?: true
	projectile?: true
	archingProjectile?: Vector3
	honeyProjectile?: true
	honeySpot?: true
	deathTimer?: Timer<false>
	drops?: Drop[]
	enemyName?: string
	enemyId?: string
	// ! Debuff
	sneeze?: Timer<false>
	poisoned?: Timer<false>
	sleepy?: Timer<false>
	sleeping?: true // intro
	pollen?: true
	sleepingPowder?: true
	modifiers?: ModifierContainer
	// ! Particles
	emitter?: ParticleEmitter<Object3DEventMap>
	autoDestroy?: true
	enemyDefeated?: ParticleSystem
	enemyImpact?: ParticleSystem
	dashParticles?: ParticleSystem
	smokeParticles?: ParticleSystem
	fireParticles?: ParticleSystem
	// ! Stats
	strength?: Stat
	critChance?: Stat
	critDamage?: Stat
	attackSpeed?: Stat
	lootQuantity?: Stat
	lootChance?: Stat
	// ! Level Editor
	entityId?: string
	// ! MiniGame
	recipesQueued?: Recipe[]
	miniGameContainer?: CSS2DObject
	spoon?: Entity
	// ! Sounds
	lastStep?: { left: boolean, right: boolean }
	// ! DayNight
	nightLight?: Light
	emissiveMat?: MeshPhongMaterial
	ambientLight?: 'night' | 'day'
	withTimeUniform?: true | (ShaderMaterial | MeshPhongMaterial)[]
	// ! Weapon
	weapon?: With<Entity, 'model' | 'weaponName' | 'weaponArc'>
	weaponArc?: WeaponArc
	weaponName?: weapons
	weaponStand?: weapons
	// ! Main menu
	stateEntity?: AppStates<typeof app>
	menuBook?: MainMenuBook
	// ! Money
	acorn?: true
	// ! Berry Bush
	bush?: true
	shake?: number
	shaken?: number
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
	stallPosition?: number
	// ! Alice
	beanstalk?: true
	magicHaricot?: Entity
	// ! Fishing
	fishingPole?: With<Entity, 'model'>
	fishingLine?: Mesh<MeshLine, MeshLineMaterial>
	fishingSpot?: true
	bobber?: With<Entity, 'position'>
	fish?: Timer<false>
	fishingProgress?: { attempts: number, success: number, done: boolean }
	bobbing?: true
	fishSpawner?: true
	// ! Lock on
	lockedOn?: CSS2DObject
	// ! Cellar
	crate?: true
	// ! Explode
	explode?: (amount: number) => void
	exploder?: With<Entity, 'explode'>
}

export type BehaviorNode<E extends Array<any>> = (...e: E) => 'success' | 'failure' | 'running'
export type Bundle<C extends keyof Entity> = () => With<Entity, C>

export type KeysOfType<T, U> = {
	[K in keyof T]: T[K] extends U ? K : never;
}[keyof T]

export type ComponentsOfType<T> = KeysOfType<Required<Entity>, T>

export type QueryEntity<Q extends Query<any>, O extends keyof Entity | void = void> = O extends string ? With<Entity, QueryKeys<Q> | O> : With<Entity, QueryKeys<Q>>

export type QueryKeys<Q extends Query<any>> = Q extends Query<infer E> ? E extends object ? RequiredKeysOf<E> : never : never