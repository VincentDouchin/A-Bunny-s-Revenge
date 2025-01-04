import type { Entity } from '@/global/entity'
import type { EnemyDef } from '@/states/dungeon/enemies'
import type { characters, items } from '@assets/assets'
import type { Item } from './items'
import { enemyBundle } from '@/states/dungeon/enemies'
import { between } from '@/utils/mapFunctions'
import { Vector3 } from 'three'
import { Rarity } from './items'

export interface Drop extends Item {
	rarity: Rarity
	recipe?: items
}

const genericEnemyAnimationMap = {
	animator: 'enemyAnimator',
	animationMap: {
		idle: 'Idle',
		running: 'Move',
		attacking: 'Attack',
		hit: 'Damage',
		dead: 'Die',
	},
} as const

export const enemy = <M extends keyof Animations & characters, S extends string> (fn: () => EnemyDef<M, S>) => {
	return (level: number) => enemyBundle(fn(), level)
}

export const Armabee = enemy(() => ({
	model: 'Armabee',
	name: 'Armabee',
	health: 3,
	scale: 4,
	drops: [{ name: 'honey', quantity: 1, rarity: Rarity.Common }],
	behavior: 'enemy',
	attackStyle: { melee: true },
	animationMap: { idle: 'Flying_Idle', running: 'Fast_Flying', attacking: 'Headbutt', hit: 'HitReact', dead: 'Death' },
	animator: 'enemyAnimator',
}))

export const SootSprite = enemy(() => ({
	model: 'soot_sprite',
	name: 'Soot sprite',
	health: 1,
	scale: between(4, 6),
	attackStyle: { melee: true },
	animationMap: { idle: 'idle', running: 'running', attacking: 'attack', dead: 'death', hit: 'hit' },
	animator: 'enemyAnimator',
}))

export const ArmabeeEvolved = enemy(() => ({
	model: 'Armabee_Evolved',
	name: 'Armabee Evolved',
	health: 20,
	scale: 10,
	boss: true,
	drops: [{ name: 'recipe', quantity: 1, recipe: 'hummus', rarity: Rarity.Always }],
	behavior: 'beeBoss',
	attackStyle: { beeBoss: true },
	animationMap: { idle: 'Flying_Idle', running: 'Fast_Flying', attacking: 'Headbutt', hit: 'HitReact', dead: 'Death' },
	animator: 'enemyAnimator',
	size: new Vector3(15, 20, 15),
}))

export const ShagaA = enemy(() => ({
	model: 'Shaga_A',
	name: 'Shaga',
	health: 4,
	scale: 2,
	drops: [{ name: 'parsley', quantity: 1, rarity: Rarity.Common }],
	attackStyle: { melee: true },
	...genericEnemyAnimationMap,
}))

export const FlowerBoar = enemy(() => ({
	model: 'Big_Boar_A',
	name: 'Flower Boar',
	health: 3,
	scale: 1.5,
	drops: [{ name: 'ham', quantity: 1, rarity: Rarity.Common }],
	attackStyle: { charging: { amount: 0, max: 1 } },
	...genericEnemyAnimationMap,
}))

export const Snail = enemy(() => ({
	model: 'Snailo_A',
	name: 'Snailo',
	health: 3,
	scale: 1.4,
	speed: 1,
	boss: false,
	drops: [{ name: 'steak', quantity: 1, rarity: Rarity.Common }],
	behavior: 'enemy',
	attackStyle: { charging: { amount: 0, max: 1 } },
	...genericEnemyAnimationMap,
}))

export const PoisonSnail = enemy(() => ({
	model: 'Snailo_B',
	name: 'Snailo',
	health: 3,
	scale: 1.4,
	drops: [{ name: 'steak', quantity: 1, rarity: Rarity.Common }],
	attackStyle: { charging: { amount: 0, max: 1 } },
	...genericEnemyAnimationMap,
	components: {
		trailMaker: true,
	},
}))

export const Slime = enemy(() => ({
	model: 'Porin_A',
	name: 'Porin',
	health: 4,
	scale: 2,
	drops: [{ name: 'slime_dough', quantity: 2, rarity: Rarity.Common }],
	attackStyle: { jumping: true },
	...genericEnemyAnimationMap,
}))

export const Raccoon = enemy(() => ({
	model: 'Racco_A',
	name: 'Racco',
	health: 3,
	scale: 2,
	attackStyle: { melee: true },
	...genericEnemyAnimationMap,
}))

export const Butterfly = enemy(() => ({
	model: 'Forest_Butterfly_A',
	name: 'Butterfly',
	health: 3,
	scale: 2,
	attackStyle: { spore: true },
	...genericEnemyAnimationMap,
}))

export const Platopo = enemy(() => ({
	model: 'Platopo_A',
	name: 'Platopo',
	health: 3,
	scale: 10,
	speed: 0.7,
	drops: [{ name: 'milk', quantity: 1, rarity: Rarity.Common }],
	attackStyle: { range: { amount: 0, max: 1 } },
	...genericEnemyAnimationMap,
}))

export const Batty = enemy(() => ({
	model: 'Batty_A',
	name: 'Batty',
	health: 5,
	scale: 25,
	attackStyle: { melee: true },
	...genericEnemyAnimationMap,
}))

export const Magicbook = enemy(() => ({
	model: 'Magicbook_A',
	name: 'Magic book',
	health: 8,
	scale: 25,
	attackStyle: { melee: true },
	...genericEnemyAnimationMap,
}))

export const Devil = enemy(() => ({
	model: 'Devilu_A',
	name: 'Batty',
	health: 5,
	scale: 25,
	attackStyle: { range: { amount: 0, max: 3 } },
	...genericEnemyAnimationMap,
}))

export const MossBoar = enemy(() => ({
	model: 'Big_Boar_B',
	name: 'Moss boar',
	health: 5,
	scale: 2.5,
	speed: 1.5,
	drops: [{ name: 'ham', quantity: 2, rarity: Rarity.Common }],
	attackStyle: { charging: { amount: 0, max: 2 } },
	...genericEnemyAnimationMap,
}))

export const BroodMother = enemy(() => ({
	model: 'spider_king',
	name: 'Spider King',
	health: 30,
	scale: 15,
	boss: true,
	attackStyle: { melee: true },
	animationMap: { attacking: 'Bite Attack', dead: 'Die', hit: 'Take Damage', running: 'Crawl Forward Fast In Place', idle: 'Idle' },
	animator: 'enemyAnimator',
}))

export const PlantChewer = enemy(() => ({
	model: 'plant_chewer',
	name: 'Plant Chewer',
	health: 30,
	scale: 15,
	drops: [],
	boss: true,
	behavior: 'pumpkinBoss',
	attackStyle: { pumpkinBoss: true },
	animationMap: { underground: 'Underground', spawn: 'Spawn', idle: 'Idle', bite: 'Bite Attack', summon: 'Cast Spell', hit: 'Take Damage', dead: 'Die', running: 'Run Forward In Place' },
	size: new Vector3(20, 20, 15),
	animator: 'pumpkinBossAnimator',
}))

export const enemyData = {
	werewolf: {
		name: 'Werewolf',
		health: 30,
		scale: 10,
		speed: 1,
		drops: [],
		boss: true,
		behavior: 'enemy',
		attackStyle: { melee: true },
		animationMap: { attacking: 'Bite Attack', dead: 'Die', hit: 'Take Damage', idle: 'Idle', running: 'Walk Forward In Place' },
	},
	death_mage: {
		name: 'Death Mage',
		health: 30,
		scale: 5,
		speed: 1,
		drops: [],
		boss: true,
		behavior: 'enemy',
		attackStyle: { melee: true },
		animationMap: { attacking: 'Kick Attack', dead: 'Die', hit: 'Take Damage', idle: 'Idle', running: 'Fly Forward In Place' },
	},
}

export const bosses = {
	spider_king: BroodMother,
	plant_chewer: PlantChewer,
	Armabee_Evolved: ArmabeeEvolved,
} as const satisfies Partial<Record<keyof Animations & characters, (level: number) => Entity>>

export type Boss = keyof typeof bosses
