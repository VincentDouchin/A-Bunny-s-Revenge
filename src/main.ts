import { beeBossBehaviorPlugin } from './behaviors/beeBossBehavior'
import { chargingEnemyBehaviorPlugin, meleeEnemyBehaviorPlugin, rangeEnemyBehaviorPlugin } from './behaviors/enemyBehavior'
import { playerBehaviorPlugin } from './behaviors/playerBehavior'
import { debugPlugin } from './debug/debugPlugin'
import { updateAnimations } from './global/animations'
import { initCamera, initializeCameraPosition, moveCamera } from './global/camera'
import { coroutines, gameTweens, inputManager, musicManager, time, ui } from './global/init'
import { initThree, renderGame } from './global/rendering'
import { initHowler } from './global/sounds'
import { app, campState, coreState, dungeonState, gameState, genDungeonState, mainMenuState, openMenuState, pausedState, setupState } from './global/states'
import { despawnOfType, hierarchyPlugin, removeStateEntity } from './lib/hierarchy'
import { updateModels } from './lib/modelsProperties'
import { particlesPlugin } from './lib/particles'
import { physicsPlugin } from './lib/physics'
import { addToScene } from './lib/registerComponents'
import { runIf } from './lib/state'
import { tickModifiers } from './lib/stats'
import { transformsPlugin } from './lib/transforms'
import { pickupAcorn } from './states/dungeon/acorn'
import { applyArchingForce, honeySplat, stepInHoney, tickSneeze } from './states/dungeon/attacks'
import { applyDeathTimer, spawnDrops, tickHitCooldown } from './states/dungeon/battle'
import { dropBerriesOnHit } from './states/dungeon/bushes'
import { spawnWeaponsChoice } from './states/dungeon/chooseWeapon'
import { removeEnemyFromSpawn } from './states/dungeon/enemies'
import { killAnimation, killEntities } from './states/dungeon/health'
import { addHealthBarContainer } from './states/dungeon/healthBar'
import { endBattleSpawnChest } from './states/dungeon/spawnChest'
import { rotateStun } from './states/dungeon/stun'
import { harvestCrop, initPlantableSpotsInteractions, interactablePlantableSpot, plantSeed, updateCropsSave } from './states/farm/farming'
import { closePlayerInventory, disableInventoryState, enableInventoryState, interact, openPlayerInventory } from './states/farm/openInventory'
import { addDashDisplay, updateDashDisplay } from './states/game/dash'
import { dayNight, playNightMusic } from './states/game/dayNight'
import { talkToNPC } from './states/game/dialog'
import { bobItems, collectItems, popItems, stopItems } from './states/game/items'
import { canPlayerMove, movePlayer, playerSteps, savePlayerFromTheEmbraceOfTheVoid, savePlayerPosition, stopPlayer } from './states/game/movePlayer'
import { pauseGame } from './states/game/pauseGame'
import { target } from './states/game/sensor'
import { basketFollowPlayer, enableBasketUi, spawnBasket } from './states/game/spawnBasket'
import { allowDoorCollision, collideWithDoor, collideWithDoorCamp, collideWithDoorClearing, doorLocking, unlockDoorClearing } from './states/game/spawnDoor'
import { spawnCrossRoad, spawnDungeon, spawnFarm, spawnLevelData, updateTimeUniforms } from './states/game/spawnLevel'
import { losingBattle, spawnCharacter, spawnPlayerClearing, spawnPlayerDungeon } from './states/game/spawnPlayer'
import { touchItem } from './states/game/touchItem'
import { addOrRemoveWeaponModel } from './states/game/weapon'
import { clickOnMenuButton, initMainMenuCamPos, intiMainMenuRendering, renderMainMenu, selectMainMenu, setMainCameraPosition, spawnPlayerContinueGame } from './states/mainMenu/mainMenuRendering'
import { playCloseSound, playOpenSound } from './states/pause/pause'
import { disablePortrait, enableFullscreen, resize, setupGame, stopOnLosingFocus } from './states/setup/setupGame'
import { UI } from './ui/UI'

coreState
	.addPlugins(hierarchyPlugin, physicsPlugin, transformsPlugin, addToScene('camera', 'light', 'model', 'dialogContainer', 'emitter', 'interactionContainer', 'minigameContainer', 'healthBarContainer', 'dashDisplay', 'stun', 'debuffsContainer'), updateModels, particlesPlugin)
	.onEnter(initThree, initCamera, moveCamera(true))
	.onEnter(ui.render(UI), initHowler)
	.addSubscriber(...target, resize, disablePortrait, enableFullscreen, stopOnLosingFocus)
	.onPreUpdate(coroutines.tick, savePlayerFromTheEmbraceOfTheVoid)
	.onUpdate(runIf(() => !pausedState.enabled, updateAnimations('enemyAnimator', 'playerAnimator', 'chestAnimator', 'houseAnimator', 'ovenAnimator'), () => time.tick()))
	.onUpdate(inputManager.update, ui.update, moveCamera())
	.enable()
setupState
	.onEnter(setupGame)
	.enable()

gameState
	.addPlugins(debugPlugin)

	.addSubscriber(initializeCameraPosition, bobItems, enableInventoryState, killAnimation, popItems, addHealthBarContainer, ...addOrRemoveWeaponModel, ...doorLocking, addDashDisplay)
	.onUpdate(
		runIf(canPlayerMove, movePlayer, updateDashDisplay),
		runIf(() => !pausedState.enabled, playerSteps, dayNight, updateTimeUniforms, applyDeathTimer, () => gameTweens.update(time.elapsed)),
		runIf(() => !openMenuState.enabled, pauseGame, interact),
	)
	.addPlugins(playerBehaviorPlugin, rangeEnemyBehaviorPlugin, chargingEnemyBehaviorPlugin, meleeEnemyBehaviorPlugin, beeBossBehaviorPlugin)
	.onUpdate(collectItems, touchItem, talkToNPC, stopItems, pickupAcorn, dropBerriesOnHit)
	.onPostUpdate(renderGame, rotateStun)
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
	.onUpdate(collideWithDoorCamp, playNightMusic)
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
	.onUpdate(collideWithDoorClearing)
	.onExit(despawnOfType('map'))

dungeonState
	.addSubscriber(spawnDrops, losingBattle, removeEnemyFromSpawn, applyArchingForce)
	.onEnter(spawnDungeon, spawnLevelData, spawnPlayerDungeon, spawnBasket, moveCamera(true))
	.onUpdate(runIf(canPlayerMove, allowDoorCollision, collideWithDoor, harvestCrop, killEntities, basketFollowPlayer()))
	.onUpdate(runIf(() => !pausedState.enabled, tickHitCooldown, tickModifiers('speed')), stepInHoney, tickSneeze, endBattleSpawnChest)
	.onUpdate(honeySplat)
	.onExit(despawnOfType('map'))
pausedState
	.onEnter(() => time.stop(), musicManager.pause)
	.onExit(() => time.start(), musicManager.play)

const animate = () => {
	app.update()
	requestAnimationFrame(animate)
}

animate()
