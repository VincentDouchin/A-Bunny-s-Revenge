import { basketBehaviorPlugin } from './behaviors/basketBehavior'
import { beeBossBehaviorPlugin } from './behaviors/beeBossBehavior'
import { chargingEnemyBehaviorPlugin, jumpingEnemyBehaviorPlugin, meleeEnemyBehaviorPlugin, rangeEnemyBehaviorPlugin } from './behaviors/enemyBehavior'
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
import { spawnGodRay } from './shaders/godrays'
import { pickupAcorn } from './states/dungeon/acorn'
import { applyArchingForce, detroyProjectiles, honeySplat, stepInHoney, tickPoison, tickSneeze } from './states/dungeon/attacks'
import { applyDeathTimer, spawnDrops, tickHitCooldown } from './states/dungeon/battle'
import { dropBerriesOnHit } from './states/dungeon/bushes'
import { spawnWeaponsChoice } from './states/dungeon/chooseWeapon'
import { removeEnemyFromSpawn, spawnEnemies } from './states/dungeon/enemies'
import { killAnimation, killEntities } from './states/dungeon/health'
import { addHealthBarContainer } from './states/dungeon/healthBar'
import { spawnPoisonTrail } from './states/dungeon/poisonTrail'
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
import { enableBasketUi, spawnBasket } from './states/game/spawnBasket'
import { allowDoorCollision, collideWithDoor, collideWithDoorCamp, collideWithDoorClearing, doorLocking, unlockDoorClearing } from './states/game/spawnDoor'
import { generatenavGrid, spawnCrossRoad, spawnDungeon, spawnFarm, spawnLevelData, updateTimeUniforms } from './states/game/spawnLevel'
import { losingBattle, spawnCharacter, spawnPlayerClearing, spawnPlayerDungeon } from './states/game/spawnPlayer'
import { touchItem } from './states/game/touchItem'
import { addOrRemoveWeaponModel, updateWeaponArc } from './states/game/weapon'
import { clickOnMenuButton, initMainMenuCamPos, intiMainMenuRendering, renderMainMenu, selectMainMenu, setMainCameraPosition, spawnPlayerContinueGame } from './states/mainMenu/mainMenuRendering'
import { playCloseSound, playOpenSound } from './states/pause/pause'
import { disablePortrait, enableFullscreen, resize, setupGame, stopOnLosingFocus } from './states/setup/setupGame'
import { UI } from './ui/UI'

coreState
	.addPlugins(hierarchyPlugin, physicsPlugin, transformsPlugin, addToScene('camera', 'light', 'model', 'dialogContainer', 'emitter', 'interactionContainer', 'minigameContainer', 'healthBarContainer', 'dashDisplay', 'stun', 'debuffsContainer', 'weaponArc'), updateModels, particlesPlugin)
	.onEnter(initThree, initCamera, moveCamera(true))
	.onEnter(ui.render(UI), initHowler)
	.addSubscriber(...target, resize, disablePortrait, enableFullscreen, stopOnLosingFocus)
	.onPreUpdate(coroutines.tick, savePlayerFromTheEmbraceOfTheVoid)
	.onUpdate(runIf(() => !pausedState.enabled, updateAnimations('enemyAnimator', 'playerAnimator', 'chestAnimator', 'houseAnimator', 'ovenAnimator', 'basketAnimator'), () => time.tick()))
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
	.addPlugins(playerBehaviorPlugin, rangeEnemyBehaviorPlugin, chargingEnemyBehaviorPlugin, meleeEnemyBehaviorPlugin, beeBossBehaviorPlugin, jumpingEnemyBehaviorPlugin, basketBehaviorPlugin)
	.onUpdate(collectItems, touchItem, talkToNPC, stopItems, pickupAcorn, dropBerriesOnHit, updateWeaponArc)
	.onPostUpdate(renderGame, rotateStun)
	.enable()
mainMenuState
	.onEnter(intiMainMenuRendering, setMainCameraPosition)
	.onUpdate(renderMainMenu, selectMainMenu)
	.addSubscriber(clickOnMenuButton, initMainMenuCamPos)
	.onExit(removeStateEntity(mainMenuState), spawnPlayerContinueGame)
campState
	.addSubscriber(...interactablePlantableSpot)
	.onEnter(spawnFarm, spawnLevelData, updateCropsSave, initPlantableSpotsInteractions, enableBasketUi, spawnGodRay)
	.onEnter(runIf(() => !mainMenuState.enabled, spawnCharacter, spawnBasket), moveCamera(true))
	.onUpdate(collideWithDoorCamp, playNightMusic)
	.onUpdate(runIf(canPlayerMove, plantSeed, harvestCrop, openPlayerInventory, savePlayerPosition))
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
	.onEnter(spawnDungeon, spawnLevelData, generatenavGrid, spawnEnemies, spawnPlayerDungeon, spawnBasket, moveCamera(true))
	.onUpdate(runIf(canPlayerMove, allowDoorCollision, collideWithDoor, harvestCrop, killEntities), detroyProjectiles)
	.onUpdate(runIf(() => !pausedState.enabled, tickHitCooldown, tickModifiers('speed'), tickSneeze, tickPoison), stepInHoney, endBattleSpawnChest, spawnPoisonTrail)
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
