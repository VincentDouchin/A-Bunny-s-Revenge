import { debugPlugin } from './debug/debugPlugin'
import { updateAnimations } from './global/animations'
import { initCamera, initializeCameraPosition, moveCamera } from './global/camera'
import { coroutines, inputManager, time, ui } from './global/init'
import { initThree, renderGame } from './global/rendering'
import { initTone } from './global/sounds'
import { app, campState, coreState, dungeonState, gameState, genDungeonState, mainMenuState, openMenuState, pausedState, setupState } from './global/states'
import { despawnOfType, hierarchyPlugin, removeStateEntity } from './lib/hierarchy'
import { updateModels } from './lib/modelsProperties'
import { particlesPlugin } from './lib/particles'
import { physicsPlugin } from './lib/physics'
import { addToScene } from './lib/registerComponents'
import { runIf } from './lib/state'
import { transformsPlugin } from './lib/transforms'
import { tweenPlugin } from './lib/updateTween'
import { pickupAcorn } from './states/dungeon/acorn'
import { applyDeathTimer, enemyAttackPlayer, playerAttack, projectilesDamagePlayer, spawnDrops } from './states/dungeon/battle'
import { dropBerriesOnHit } from './states/dungeon/bushes'
import { spawnWeaponsChoice } from './states/dungeon/chooseWeapon'
import { removeEnemyFromSpawn } from './states/dungeon/enemies'
import { killAnimation, killEntities } from './states/dungeon/health'
import { addHealthBarContainer } from './states/dungeon/healthBar'
import { endBattleSpawnChest } from './states/dungeon/spawnChest'
import { harvestCrop, initPlantableSpotsInteractions, interactablePlantableSpot, plantSeed, updateCropsSave } from './states/farm/farming'
import { closePlayerInventory, disableInventoryState, enableInventoryState, interact, openPlayerInventory } from './states/farm/openInventory'
import { basketFSM, beeBossFSM, beeFSM, playerFSM, shagaFSM } from './states/game/FSM'
import { dayNight, initTimeOfDay } from './states/game/dayNight'
import { talkToNPC } from './states/game/dialog'
import { bobItems, popItems, stopItems } from './states/game/items'
import { applyMove, canPlayerMove, movePlayer, playerSteps, savePlayerFromTheEmbraceOfTheVoid, savePlayerPosition, stopPlayer } from './states/game/movePlayer'
import { pauseGame } from './states/game/pauseGame'
import { target } from './states/game/sensor'
import { basketFollowPlayer, collectItems, enableBasketUi, spawnBasket } from './states/game/spawnBasket'
import { allowDoorCollision, collideWithDoor, collideWithDoorCamp, collideWithDoorClearing, doorLocking, unlockDoorClearing } from './states/game/spawnDoor'
import { spawnCrossRoad, spawnDungeon, spawnFarm, spawnLevelData, updateTimeUniforms } from './states/game/spawnLevel'
import { losingBattle, spawnCharacter, spawnPlayerClearing, spawnPlayerDungeon } from './states/game/spawnPlayer'
import { touchItem } from './states/game/touchItem'
import { addOrRemoveWeaponModel } from './states/game/weapon'
import { clickOnMenuButton, initMainMenuCamPos, intiMainMenuRendering, renderMainMenu, selectMainMenu, setMainCameraPosition, spawnPlayerContinueGame } from './states/mainMenu/mainMenuRendering'
import { playCloseSound, playOpenSound } from './states/pause/pause'
import { disablePortrait, enableFullscreen, resize, setupGame } from './states/setup/setupGame'
import { UI } from './ui/UI'

coreState
	.onEnter(initThree, initCamera, moveCamera(true), initTimeOfDay)
	.addPlugins(hierarchyPlugin, physicsPlugin, transformsPlugin, addToScene('camera', 'light', 'model', 'dialogContainer', 'emitter', 'interactionContainer', 'minigameContainer', 'healthBarContainer'), updateModels, particlesPlugin, tweenPlugin)
	.addSubscriber(...target, initTone, resize, disablePortrait, enableFullscreen)
	.onEnter(ui.render(UI))
	.onPreUpdate(coroutines.tick, savePlayerFromTheEmbraceOfTheVoid)
	.onUpdate(runIf(() => !pausedState.enabled, updateAnimations('beeAnimator', 'playerAnimator', 'shagaAnimator', 'ovenAnimator', 'chestAnimator', 'houseAnimator', 'basketAnimator', 'beeBossAnimator'), () => time.tick()), inputManager.update, ui.update, moveCamera())
	.enable()
setupState
	.onEnter(setupGame)
	.enable()

gameState
	.addPlugins(debugPlugin)

	.addSubscriber(initializeCameraPosition, bobItems, enableInventoryState, killAnimation, ...playerFSM, ...beeFSM, ...shagaFSM, ...basketFSM, ...beeBossFSM, popItems, addHealthBarContainer, ...addOrRemoveWeaponModel, ...doorLocking)
	.onUpdate(
		runIf(canPlayerMove, movePlayer),
		runIf(() => !pausedState.enabled, playerSteps, dayNight, updateTimeUniforms, applyDeathTimer, applyMove),
		runIf(() => !openMenuState.enabled, pauseGame, interact),
	)
	.onUpdate(collectItems, touchItem, talkToNPC, stopItems, pickupAcorn)
	.onPostUpdate(renderGame)
	.enable()
mainMenuState
	.onEnter(intiMainMenuRendering, setMainCameraPosition)
	.onUpdate(renderMainMenu, selectMainMenu)
	.addSubscriber(clickOnMenuButton, initMainMenuCamPos)
	.onExit(removeStateEntity(mainMenuState), spawnPlayerContinueGame)
campState
	.addSubscriber(...interactablePlantableSpot)
	.onEnter(spawnFarm, spawnLevelData, updateCropsSave, initPlantableSpotsInteractions, enableBasketUi)
	.onEnter(runIf(() => !mainMenuState.enabled, spawnCharacter, spawnBasket), moveCamera(true))
	.onUpdate(collideWithDoorCamp, dropBerriesOnHit)
	.onUpdate(runIf(canPlayerMove, plantSeed, harvestCrop, openPlayerInventory, savePlayerPosition, basketFollowPlayer()))
	.onExit(despawnOfType('map'))
openMenuState
	.onEnter(playOpenSound, stopPlayer)
	.addSubscriber(disableInventoryState)
	.onExit(playCloseSound)
	.onUpdate(closePlayerInventory)
genDungeonState
	.addSubscriber(unlockDoorClearing)
	.onEnter(spawnCrossRoad, spawnLevelData, spawnPlayerClearing, spawnWeaponsChoice, moveCamera(true))
	.onUpdate(collideWithDoorClearing, playerAttack)
	.onExit(despawnOfType('map'))

dungeonState
	.addSubscriber(spawnDrops, losingBattle, endBattleSpawnChest, removeEnemyFromSpawn)
	.onEnter(spawnDungeon, spawnLevelData, spawnPlayerDungeon, spawnBasket, moveCamera(true))
	.onUpdate(runIf(canPlayerMove, allowDoorCollision, collideWithDoor, enemyAttackPlayer, harvestCrop, playerAttack, killEntities, basketFollowPlayer()), projectilesDamagePlayer)
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
