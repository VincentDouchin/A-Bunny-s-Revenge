import type { enemy } from '@/constants/enemies'
import type { crops, Item } from '@/constants/items'
import type { NPC } from '@/constants/NPC'
import type { Quest2 } from '@/constants/quests'
import type { Recipe } from '@/constants/recipes'
import type { MenuInputMap, PlayerInputMap } from '@/global/inputMaps'
import type { AppStates } from '@/lib/app'
import type { Direction } from '@/lib/directions'
import type { MeshLine, MeshLineMaterial } from '@/lib/MeshLine'
import type { NavGrid } from '@/lib/navGrid'
import type { Stat } from '@/lib/stats'
import type { Timer } from '@/lib/timer'
import type { WeaponArc } from '@/shaders/weaponArc'
import type { Room } from '@/states/dungeon/generateDungeon'
import type { Dash } from '@/states/game/dash'
import type { MainMenuBook } from '@/states/mainMenu/book'
import type { items, voices, weapons } from '@assets/assets'
import type { Collider, ColliderDesc, KinematicCharacterController, RigidBody, RigidBodyDesc, Shape } from '@dimforge/rapier3d-compat'
import type { Query, With } from 'miniplex'
import type { BufferGeometry, Camera, Group, Light, Mesh, MeshPhongMaterial, Object3D, Object3DEventMap, Quaternion, Scene, ShaderMaterial, Sprite, Vector3, WebGLRenderer } from 'three'
import type { BatchedRenderer, ParticleEmitter, ParticleSystem } from 'three.quarks'
import type { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import type { Animator } from './animator'
import type { InstanceHandle } from './assetLoaders'
import type { ModifierContainer } from './modifiers'
import type { app } from './states'

export type PlayerAnimations = 'idle' | 'runFront' | 'runLeft' | 'runRight' | 'runBack' | 'lightAttack' | 'slashAttack' | 'heavyAttack' | 'hit' | 'dying' | 'fishing' | 'sleeping' | 'wakeUp' | 'interact' | 'pickup' | 'dashFront' | 'dashLeft' | 'dashRight' | 'dashBack'
export type EnemyAnimations = 'idle' | 'running' | 'attacking' | 'hit' | 'dead'
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
	OvenMinigame,
	CauldronGame,
	SelectSeed,
	Basket,
	Fishing,
}
export enum RenderGroup {
	MainMenu,
	Game,
}
export enum EnemyAttackStyle {
	Charging,
	ChargingTwice,
	Range,
	RangeThrice,
	Melee,
	Jumping,
	Spore,
	BeeBoss,
}
export const actors = ['cellarDoor', 'houseDoor', 'playerIntro', 'basketIntro', 'intro', 'cellarStairs', 'oven', 'cookingPot'] as const
export const farmDoors = ['intro', 'cellar', 'clearing', 'village', 'fromVillage'] as const
export type Doors = typeof farmDoors[number] | Direction
export type Actor = (typeof actors)[number]

export interface States {
	basket: 'idle' | 'running'
	player: 'idle' | 'running' | 'attack' | 'dying' | 'dead' | 'picking' | 'dash' | 'hit' | 'stun' | 'poisoned' | 'managed'
	enemy: 'idle' | 'running' | 'attack' | 'hit' | 'dying' | 'dead' | 'waitingAttack' | 'attackCooldown' | 'stun' | 'wander'
	boss: 'idle' | 'running' | 'rangeAttack' | 'attack' | 'dying' | 'dead' | 'waitingAttack' | 'attackCooldown' | 'hit'
	fish: 'going' | 'hooked' | 'wander' | 'bounce' | 'runaway'
}
export interface Crop {
	stage: number
	name: crops
	watered: boolean
	luck: number
	planted: number
}

export interface Entity {
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
	cameratarget?: true
	cameraShake?: Vector3
	initialCameratarget?: true
	followCamera?: true
	fixedCamera?: true
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
	behaviorController?: keyof States
	// ! Animations
	playerAnimator?: Animator<PlayerAnimations>
	basketAnimator?: Animator<Animations['Basket']>
	enemyAnimator?: Animator<EnemyAnimations>
	ovenAnimator?: Animator<Animations['BunnyOvenPacked']>
	houseAnimator?: Animator<Animations['House']>
	chestAnimator?: Animator<Animations['Chest']>
	kayAnimator?: Animator<Animations['ALICE_animated']>
	cellarDoorAnimator?: Animator<Animations['cellar_entrance']>
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
	combo?: {
		lastAttack: number
		heavyAttack: number
	}
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
	enemyName?: enemy
	inactive?: Timer<false>
	healthBar?: true
	healthBarContainer?: CSS2DObject
	boss?: true
	projectile?: true
	archingProjectile?: Vector3
	honeyProjectile?: true
	honeySpot?: true
	deathTimer?: Timer<false>
	attackPattern?: 'melee' | 'distance'
	attackStyle?: EnemyAttackStyle
	charges?: number
	// ! Debuff
	sneeze?: Timer<false>
	poisoned?: Timer<false>
	sleepy?: Timer<false>
	sleeping?: true // intro
	pollen?: true
	sleepingPowder?: true
	modifiers?: ModifierContainer
	// ! AI
	navGrid?: NavGrid
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
	fishingProgress?: { attempts: number, sucess: number, done: boolean }
	bobbing?: true
	fishSpawner?: true
	// ! Lock on
	lockedOn?: CSS2DObject
	// ! Cellar
	crate?: true

}
export type Bundle<C extends keyof Entity> = () => With<Entity, C>

export type KeysOfType<T, U> = {
	[K in keyof T]: T[K] extends U ? K : never;
}[keyof T]
type UnionToIntersection<U> =
	(U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

type LastOf<T> =
	UnionToIntersection<T extends any ? () => T : never> extends () => infer R ? R : never

type UnionToTuple<T, L = LastOf<T>> =
	[T] extends [never] ? [] : [...UnionToTuple<Exclude<T, L>>, L]
export type ComponentsOfType<T> = KeysOfType<Required<Entity>, T>
export type AllComponentsOfType<T> = UnionToTuple<ComponentsOfType<T>>

export type QueryEntity<Q extends Query<any>> = Q extends Query<infer E> ? E : never