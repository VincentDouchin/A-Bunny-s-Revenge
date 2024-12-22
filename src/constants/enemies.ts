import type { EnemyAnimations, Entity, States } from '@/global/entity'
import type { characters, items } from '@assets/assets'
import type { Item } from './items'
import { EnemyAttackStyle } from '@/global/entity'
import { between } from '@/utils/mapFunctions'
import { Rarity } from './items'

export interface Drop extends Item {
	rarity: Rarity
	recipe?: items
}
export interface Enemy<Name extends keyof Animations> {
	name: string
	health: number
	scale: number | (() => number)
	speed: number
	boss: boolean
	behavior: keyof States
	attackStyle: EnemyAttackStyle
	drops: Drop[]
	animationMap: Record<EnemyAnimations, Animations[Name]>
	components?: () => Entity
}
export const enemies = ['Armabee', 'Armabee_Evolved', 'Shaga_A', 'Big_Boar_A', 'Snailo_A', 'Snailo_B', 'Porin_A', 'Forest_Butterfly_A', 'Racco_A', 'Platopo_A', 'Batty_A', 'Big_Boar_C', 'Magicbook_A', 'Devilu_A', 'Big_Boar_B', 'soot_sprite', 'spider_king', 'plant_chewer', 'werewolf', 'death_mage'] as const satisfies characters[]
export type enemy = (typeof enemies)[number]

const genericEnemyAnimationMap: Record<EnemyAnimations, Animations['Big_Boar_A']> = {
	idle: 'Idle',
	running: 'Move',
	attacking: 'Attack',
	hit: 'Damage',
	dead: 'Die',
}

export const enemyData: { [k in enemy]: Enemy<k> } = {
	// ! Cellar
	soot_sprite: {
		name: 'Soot sprite',
		health: 1,
		scale: () => between(4, 6),
		speed: 1,
		boss: false,
		drops: [],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Melee,
		animationMap: {
			idle: 'idle',
			running: 'running',
			attacking: 'attack',
			dead: 'death',
			hit: 'hit',
		},
	},
	Armabee: {
		name: 'Armabee',
		health: 3,
		scale: 4,
		speed: 1,
		boss: false,
		drops: [{ name: 'honey', quantity: 1, rarity: Rarity.Common }],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Melee,
		animationMap: {
			idle: 'Flying_Idle',
			running: 'Fast_Flying',
			attacking: 'Headbutt',
			hit: 'HitReact',
			dead: 'Death',
		},
	},
	Armabee_Evolved: {
		name: 'Armabee Evolved',
		health: 20,
		scale: 10,
		speed: 1,
		boss: true,
		drops: [{ name: 'recipe', quantity: 1, recipe: 'hummus', rarity: Rarity.Always }],
		behavior: 'boss',
		attackStyle: EnemyAttackStyle.BeeBoss,
		animationMap: {
			idle: 'Flying_Idle',
			running: 'Fast_Flying',
			attacking: 'Headbutt',
			hit: 'HitReact',
			dead: 'Death',
		},

	},
	Shaga_A: {
		name: 'Shaga',
		health: 4,
		scale: 2,
		speed: 1,
		boss: false,
		drops: [{ name: 'parsley', quantity: 1, rarity: Rarity.Common }],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Melee,
		animationMap: genericEnemyAnimationMap,
	},
	Big_Boar_A: {
		name: 'Flower Boar',
		health: 3,
		scale: 1.5,
		speed: 1,
		boss: false,
		drops: [{ name: 'ham', quantity: 1, rarity: Rarity.Common }],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Charging,
		animationMap: genericEnemyAnimationMap,
	},
	Snailo_A: {
		name: 'Snailo',
		health: 3,
		scale: 1.4,
		speed: 1,
		boss: false,
		drops: [{ name: 'steak', quantity: 1, rarity: Rarity.Common }],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Charging,
		animationMap: genericEnemyAnimationMap,
	},
	Snailo_B: {
		name: 'Snailo',
		health: 3,
		scale: 1.4,
		speed: 1,
		boss: false,
		drops: [{ name: 'steak', quantity: 1, rarity: Rarity.Common }],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Charging,
		animationMap: genericEnemyAnimationMap,
		components: () => ({
			trailMaker: true,
		}),
	},
	Porin_A: {
		name: 'Porin',
		health: 4,
		scale: 2,
		speed: 1,
		boss: false,
		drops: [{ name: 'slime_dough', quantity: 2, rarity: Rarity.Common }],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Jumping,
		animationMap: genericEnemyAnimationMap,
	},
	Racco_A: {
		name: 'Racco',
		health: 3,
		scale: 2,
		speed: 1,
		boss: false,
		drops: [],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Melee,
		animationMap: genericEnemyAnimationMap,
	},
	Forest_Butterfly_A: {
		name: 'Butterfly',
		health: 3,
		scale: 2,
		speed: 1,
		boss: false,
		drops: [],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Spore,
		animationMap: genericEnemyAnimationMap,
	},
	Platopo_A: {
		name: 'Platopo',
		health: 3,
		scale: 10,
		speed: 0.7,
		boss: false,
		drops: [{ name: 'milk', quantity: 1, rarity: Rarity.Common }],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Range,
		animationMap: genericEnemyAnimationMap,
	},
	Batty_A: {
		name: 'Batty',
		health: 5,
		scale: 25,
		speed: 1,
		boss: false,
		drops: [],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Melee,
		animationMap: genericEnemyAnimationMap,
	},
	Magicbook_A: {
		name: 'Magic book',
		health: 8,
		scale: 25,
		speed: 1,
		boss: false,
		drops: [],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Melee,
		animationMap: genericEnemyAnimationMap,
	},
	Devilu_A: {
		name: 'Batty',
		health: 5,
		scale: 25,
		speed: 1,
		boss: false,
		drops: [],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.RangeThrice,
		animationMap: genericEnemyAnimationMap,
	},
	Big_Boar_C: {
		name: 'Biggie',
		health: 40,
		scale: 10,
		speed: 1,
		boss: true,
		drops: [],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.BeeBoss,
		animationMap: genericEnemyAnimationMap,
	},
	Big_Boar_B: {
		name: 'Moss boar',
		health: 5,
		scale: 2.5,
		speed: 1.5,
		boss: false,
		drops: [{ name: 'ham', quantity: 2, rarity: Rarity.Common }],
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.ChargingTwice,
		animationMap: genericEnemyAnimationMap,
	},
	spider_king: {
		name: 'Spider King',
		health: 30,
		scale: 15,
		speed: 1,
		drops: [],
		boss: true,
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Melee,
		animationMap: { attacking: 'Bite Attack', dead: 'Die', hit: 'Take Damage', running: 'Crawl Forward Fast In Place', idle: 'Idle' },
	},
	plant_chewer: {
		name: 'Plant Chewer',
		health: 30,
		scale: 15,
		speed: 1,
		drops: [],
		boss: true,
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Melee,
		animationMap: { attacking: 'Bite Attack', dead: 'Die', hit: 'Take Damage', idle: 'Idle', running: 'Walk Forward In Place' },
	},
	werewolf: {
		name: 'Werewolf',
		health: 30,
		scale: 10,
		speed: 1,
		drops: [],
		boss: true,
		behavior: 'enemy',
		attackStyle: EnemyAttackStyle.Melee,
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
		attackStyle: EnemyAttackStyle.Melee,
		animationMap: { attacking: 'Kick Attack', dead: 'Die', hit: 'Take Damage', idle: 'Idle', running: 'Fly Forward In Place' },
	},

}
