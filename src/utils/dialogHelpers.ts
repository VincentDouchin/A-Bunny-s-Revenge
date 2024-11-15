import type { Item } from '@/constants/items'
import type { Entity } from '@/global/entity'
import type { items } from '@assets/assets'
import type { Query, With } from 'miniplex'
import { applyMove, applyRotate } from '@/behaviors/behaviorHelpers'
import { toastEvent } from '@/global/events'
import { addItem, coroutines, ecs, removeItem, save } from '@/global/init'
import { playSound } from '@/global/sounds'
import { app } from '@/global/states'
import { heartEmitter } from '@/particles/heartParticles'
import { Vector3 } from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { sleep } from './sleep'

const npcNameQuery = ecs.with('npcName')
export const speaker = (name?: Entity['npcName']) => {
	for (const npc of npcNameQuery) {
		if (npc.npcName === name && !npc.dialogContainer) {
			const dialogContainer = new CSS2DObject(document.createElement('div'))
			if (npc.dialogHeight) {
				dialogContainer.position.y = npc.dialogHeight
			}
			ecs.update(npc, { dialogContainer })
		} else {
			ecs.removeComponent(npc, 'dialogContainer')
		}
	}
}

const playerQuery = ecs.with('player', 'position', 'collider')
const movingPlayerQuery = playerQuery.with('body', 'targetRotation', 'rotation')
export const houseQuery = ecs.with('npcName', 'position', 'collider', 'rotation', 'houseAnimator').where(({ npcName }) => npcName === 'Grandma')
export const doorQuery = ecs.with('npcName', 'collider').where(({ npcName }) => npcName === 'door')
export const setSensor = <T extends With<Entity, 'collider'>>(query: Query<T>, sensor: boolean) => {
	for (const { collider } of query) {
		collider.setSensor(sensor)
	}
}
export const lockPlayer = () => {
	for (const player of playerQuery) {
		ecs.removeComponent(player, 'movementForce')
	}
}
export const unlockPlayer = () => {
	for (const player of playerQuery) {
		ecs.addComponent(player, 'movementForce', new Vector3())
	}
}
export const movePlayerTo = (dest: Vector3) => {
	return new Promise<void>((resolve) => {
		for (const player of movingPlayerQuery) {
			player.movementForce = dest.clone().sub(player.position).normalize()
			coroutines.add(function* () {
				while (player.position.distanceTo(dest) > 2) {
					applyMove(player, dest.clone().sub(player.position).normalize())
					applyRotate(player, dest.clone().sub(player.position).normalize())
					yield
				}
				player.movementForce?.setScalar(0)
				resolve()
			})
		}
	})
}
export const sleepPlayer = async () => {
	const player = playerQuery.first
	if (player) {
		player.modifiers?.addModifier('sleepingPowder')
		await sleep(5000)
		await player.playerAnimator?.playClamped('wakeUp')
		ecs.update(player, { state: 'idle' })
	}
}
export const playerInventoryQuery = ecs.with('inventoryId', 'inventory', 'inventorySize', 'player', 'currentHealth', 'maxHealth')
export const unlockRecipe = (item: items) => {
	save.unlockedRecipes.push(item)
	toastEvent.emit({ type: 'recipe', recipe: item })
}
export const addItemToPlayer = async (item: Item) => {
	const player = playerInventoryQuery.first
	if (player) {
		if (item.health) {
			ecs.add({
				parent: player,
				emitter: heartEmitter(),
				position: new Vector3(),
				autoDestroy: true,
			})
			player.currentHealth = Math.min(player.maxHealth.value, player.currentHealth + item.health)
		} else if (item.recipe) {
			unlockRecipe(item.recipe)
		} else {
			await addItem(player, item)
			toastEvent.emit({ type: 'addedItem', item: item.name, quantity: item.quantity })
		}
	}
}
export const removeItemFromPlayer = (item: Item) => {
	const player = playerInventoryQuery.first
	if (player) {
		removeItem(player, item)
		toastEvent.emit({ type: 'removedItem', item: item.name, quantity: item.quantity })
	}
}

export const hasItem = (itemName: items | ((item: Item) => boolean)) => {
	if (!save.inventories.player) return
	for (const item of save.inventories.player.filter(Boolean)) {
		if (typeof itemName === 'string') {
			if (item.name === itemName) return true
		} else {
			if (itemName(item)) return true
		}
	}
	return false
}
export const hasEaten = () => {
	return save.modifiers.length > 0
}

export const enterHouse = async () => {
	app.enable('cutscene')
	setSensor(doorQuery, true)
	setSensor(houseQuery, true)
	const house = houseQuery.first

	if (house) {
		playSound(['glitchedtones_Door+Bedroom+Open+01', 'glitchedtones_Door+Bedroom+Open+02'])
		await house.houseAnimator.playClamped('DoorOpen')
		movePlayerTo(house.position)
		await sleep(500)
		await house.houseAnimator.playClamped('DoorClose')
		playSound(['zapsplat_household_door_backdoor_close_002_56921', 'zapsplat_household_door_backdoor_close_004_56923'])
	}
}
export const leaveHouse = async () => {
	const house = houseQuery.first
	if (house) {
		playSound(['glitchedtones_Door+Bedroom+Open+01', 'glitchedtones_Door+Bedroom+Open+02'])
		await house.houseAnimator.playClamped('DoorOpen')
		await movePlayerTo(new Vector3(0, 0, 50).applyQuaternion(house.rotation).add(house.position))
		app.disable('cutscene')
		await sleep(1000)
		await house.houseAnimator.playClamped('DoorClose')
		setSensor(houseQuery, false)
		playSound(['zapsplat_household_door_backdoor_close_002_56921', 'zapsplat_household_door_backdoor_close_004_56923'])
	}
	app.disable('cutscene')
}

// ! Alice
// const aliceQuery = ecs.with('npcName', 'kayAnimator', 'position', 'rotation', 'model', 'group', 'collider', 'body').where(e => e.npcName === 'Alice')

export const aliceJumpDown = async () => {
	// for (const alice of aliceQuery) {
	// 	const followPosition = () => {
	// 		alice.body.setTranslation(getWorldPosition(alice.group).add(new Vector3(0, 10, 0)), true)
	// 	}
	// 	tweens.add({
	// 		from: alice.position.clone(),
	// 		to: new Vector3(0, -15, 5).applyQuaternion(alice.rotation).add(alice.position),
	// 		duration: alice.kayAnimator.animationClips.Jump_Full_Long.duration * 1000 / 2 - 200,
	// 		onUpdate: f => alice.position.copy(f),
	// 	})
	// 	followPosition()
	// 	await alice.kayAnimator.playClamped('Jump_Full_Long', { timeScale: 2 })
	// 	alice.kayAnimator.playAnimation('Idle')
	// 	const hummus = assets.items.hummus.model.clone()
	// 	hummus.rotateZ(Math.PI / 2 * 1.3)
	// 	addToHand(alice, hummus)
	// 	await sleep(1000)
	// 	await alice.kayAnimator.playOnce('Use_Item')
	// 	removeItemFromPlayer({ name: 'hummus', quantity: 1 })
	// 	hummus.removeFromParent()
	// 	alice.kayAnimator.playAnimation('Idle')
	// 	alice.collider.setSensor(false)
	// 	alice.collider.setActiveCollisionTypes(ActiveCollisionTypes.ALL)
	// 	tweens.add({
	// 		from: alice.group.scale.clone(),
	// 		to: alice.group.scale.clone().multiplyScalar(8),
	// 		duration: 2000,
	// 		ease: reverseEasing(createBackIn(3)),
	// 		onUpdate: (f) => {
	// 			if (alice.collider.shape.type === ShapeType.Cylinder) {
	// 				alice.collider.setRadius(f.length())
	// 			}
	// 			alice.group.scale.copy(f) },
	// 		onComplete: () => {
	// 			ecs.removeComponent(alice, 'dialog')
	// 			completeQuestStep('alice_1', 'makeHummus')
	// 			ecs.update(alice, {
	// 				dialog: dialogs.AliceBig(),
	// 				activeDialog: true,
	// 			})
	// 		},
	// 	})
	// }
}