import { debugPlugin } from './debug/debugPlugin'
import { updateAnimations } from './global/animations'
import { initCamera, initializeCameraPosition, moveCamera } from './global/camera'
import { coroutines, inputManager, time, ui } from './global/init'
import { initThree, render, updateControls } from './global/rendering'
import { initTone } from './global/sounds'
import { app, campState, coreState, dungeonState, gameState, genDungeonState, openMenuState, pausedState, setupState } from './global/states'
import { despawnOfType, hierarchyPlugin } from './lib/hierarchy'
import { updateModels } from './lib/modelsProperties'
import { particlesPlugin } from './lib/particles'
import { physicsPlugin } from './lib/physics'
import { addToScene } from './lib/registerComponents'
import { runIf } from './lib/state'
import { transformsPlugin } from './lib/transforms'
import { tweenPlugin } from './lib/updateTween'
import { applyDeathTimer, enemyAttackPlayer, playerAttack, projectilesDamagePlayer, spawnDrops } from './states/dungeon/battle'
import { removeEnemyFromSpawn } from './states/dungeon/enemies'
import { killAnimation, killEntities } from './states/dungeon/health'
import { addHealthBarContainer } from './states/dungeon/healthBar'
import { endBattleSpawnChest } from './states/dungeon/spawnChest'
import { harvestCrop, initPlantableSpotsInteractions, interactablePlantableSpot, plantSeed, updateCropsSave } from './states/farm/farming'
import { closePlayerInventory, disableInventoryState, enableInventoryState, interact, openPlayerInventory } from './states/farm/openInventory'
import { basketFSM, beeBossFSM, beeFSM, playerFSM, shagaFSM } from './states/game/FSM'
import { dayNight } from './states/game/dayNight'
import { talkToNPC } from './states/game/dialog'
import { bobItems, collectItems, popItems, stopItems } from './states/game/items'
import { applyMove, canPlayerMove, movePlayer, playerSteps, savePlayerFromTheEmbraceOfTheVoid, savePlayerPosition, stopPlayer } from './states/game/movePlayer'
import { pauseGame } from './states/game/pauseGame'
import { target } from './states/game/sensor'
import { basketFollowPlayer, enableBasketUi, spawnBasket } from './states/game/spawnBasket'
import { allowDoorCollision, collideWithDoor, collideWithDoorCamp, collideWithDoorClearing } from './states/game/spawnDoor'
import { spawnCrossRoad, spawnDungeon, spawnFarm, spawnLevelData, updateTimeUniforms } from './states/game/spawnLevel'
import { debugPlayer, losingBattle, spawnCharacter } from './states/game/spawnPlayer'
import { touchItem } from './states/game/touchItem'
import { addOrRemoveWeaponModel } from './states/game/weapon'
import { playCloseSound, playOpenSound } from './states/pause/pause'
import { disablePortrait, enableFullscreen, resize, setupGame } from './states/setup/setupGame'
import { UI } from './ui/UI'

coreState
	.addPlugins(debugPlugin)
	.addPlugins(hierarchyPlugin, physicsPlugin, transformsPlugin, addToScene('camera', 'light', 'mesh', 'model', 'dialogContainer', 'batchRenderer', 'emitter', 'interactionContainer', 'minigameContainer', 'healthBarContainer'), updateModels, particlesPlugin, tweenPlugin)
	.addSubscriber(...target, initTone, resize, disablePortrait, enableFullscreen)
	.onEnter(initCamera, initThree, ui.render(UI))
	.onPreUpdate(coroutines.tick, savePlayerFromTheEmbraceOfTheVoid)
	.onUpdate(runIf(() => !pausedState.enabled, updateAnimations('beeAnimator', 'playerAnimator', 'shagaAnimator', 'ovenAnimator', 'chestAnimator', 'houseAnimator', 'basketAnimator', 'beeBossAnimator'), () => time.tick()), inputManager.update, ui.update, moveCamera)
	.onPostUpdate(updateControls, render)
	.enable()
setupState
	.onEnter(setupGame)
	.enable()
gameState
	.onEnter()
	.addSubscriber(initializeCameraPosition, bobItems, enableInventoryState, killAnimation, ...playerFSM, ...beeFSM, ...shagaFSM, ...basketFSM, ...beeBossFSM, popItems, addHealthBarContainer, ...addOrRemoveWeaponModel)
	.onUpdate(
		runIf(canPlayerMove, movePlayer, applyMove),
		runIf(() => !pausedState.enabled, playerSteps, dayNight, updateTimeUniforms, applyDeathTimer),
	)
	.onUpdate(collectItems, touchItem, talkToNPC, stopItems, runIf(() => !openMenuState.enabled, pauseGame, interact))
	.enable()
campState
	.addSubscriber(...interactablePlantableSpot)
	.onEnter(spawnFarm, spawnLevelData, updateCropsSave, initPlantableSpotsInteractions, spawnCharacter, spawnBasket, enableBasketUi)
	.onUpdate(collideWithDoorCamp, debugPlayer)
	.onUpdate(runIf(canPlayerMove, plantSeed, harvestCrop, openPlayerInventory, savePlayerPosition, basketFollowPlayer))
	.onExit(despawnOfType('map'))
openMenuState
	.onEnter(playOpenSound, stopPlayer)
	.addSubscriber(disableInventoryState)
	.onExit(playCloseSound)
	.onUpdate(closePlayerInventory)
genDungeonState
	.onEnter(spawnCrossRoad, spawnLevelData)
	.onUpdate(collideWithDoorClearing)
	.onExit(despawnOfType('map'))

dungeonState
	.addSubscriber(spawnDrops, losingBattle, endBattleSpawnChest, removeEnemyFromSpawn)
	.onEnter(spawnDungeon, spawnLevelData, spawnBasket)
	.onUpdate(runIf(canPlayerMove, allowDoorCollision, collideWithDoor, enemyAttackPlayer, harvestCrop, playerAttack, killEntities, basketFollowPlayer), projectilesDamagePlayer)
	.onExit(despawnOfType('map'))
pausedState
	.onExit(() => time.reset())
// const bossRoom = assignPlanAndEnemies([{ position: { x: 0, y: 0 }, connections: { north: 1, south: null }, type: RoomType.Battle }])
// const dungeon = genDungeon(5, true).find(room => room.type === RoomType.Entrance)!
// dungeonState.enable({ dungeon: bossRoom[0], direction: 'south', firstEntry: true, playerHealth: 5, dungeonLevel: 0 })
const animate = () => {
	app.update()
	requestAnimationFrame(animate)
}

animate()
