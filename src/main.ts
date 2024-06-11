import { basketBehaviorPlugin } from './behaviors/basketBehavior'
import { beeBossBehaviorPlugin } from './behaviors/beeBossBehavior'
import { chargingEnemyBehaviorPlugin, jumpingEnemyBehaviorPlugin, meleeEnemyBehaviorPlugin, rangeEnemyBehaviorPlugin, sporeBehaviorPlugin } from './behaviors/enemyBehavior'
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
import { applyArchingForce, detroyProjectiles, honeySplat, stepInHoney, tickPoison, tickSleepy, tickSneeze } from './states/dungeon/attacks'
import { applyDeathTimer, tickHitCooldown } from './states/dungeon/battle'
import { dropBerriesOnHit } from './states/dungeon/bushes'
import { buyItems } from './states/dungeon/buyItems'
import { spawnWeaponsChoice } from './states/dungeon/chooseWeapon'
import { removeEnemyFromSpawn, spawnEnemies, tickInactiveTimer, unlockDungeon } from './states/dungeon/enemies'
import { killAnimation, killEntities } from './states/dungeon/health'
import { addHealthBarContainer } from './states/dungeon/healthBar'
import { spawnDrops } from './states/dungeon/lootPool'
import { spawnPoisonTrail } from './states/dungeon/poisonTrail'
import { endBattleSpawnChest } from './states/dungeon/spawnChest'
import { rotateStun } from './states/dungeon/stun'
import { addBeanStalkHole, growMagicBean, harvestMagicBean } from './states/farm/beanStalk'
import { growCrops, harvestCrop, initPlantableSpotsInteractions, interactablePlantableSpot, plantSeed } from './states/farm/farming'
import { fishingPlugin } from './states/farm/fishing'
import { closePlayerInventory, disableInventoryState, enableInventoryState, interact, openPlayerInventory } from './states/farm/openInventory'
import { waterCrops } from './states/farm/wateringCan'
import { addDashDisplay, updateDashDisplay } from './states/game/dash'
import { dayNight, playNightMusic } from './states/game/dayNight'
import { addQuestMarkers, talkToNPC, turnNPCHead } from './states/game/dialog'
import { equip } from './states/game/equip'
import { bobItems, collectItems, popItems, stopItems } from './states/game/items'
import { canPlayerMove, movePlayer, playerSteps, savePlayerFromTheEmbraceOfTheVoid, savePlayerPosition, stopPlayer } from './states/game/movePlayer'
import { pauseGame } from './states/game/pauseGame'
import { target } from './states/game/sensor'
import { allowDoorCollision, collideWithDoor, collideWithDoorCamp, collideWithDoorClearing, doorLocking, unlockDoorClearing } from './states/game/spawnDoor'
import { generatenavGrid, spawnCrossRoad, spawnDungeon, spawnFarm, spawnLevelData, updateTimeUniforms } from './states/game/spawnLevel'
import { losingBattle, spawnCharacter, spawnPlayerClearing, spawnPlayerDungeon } from './states/game/spawnPlayer'
import { touchItem } from './states/game/touchItem'
import { updateWeaponArc } from './states/game/weapon'
import { clickOnMenuButton, initMainMenuCamPos, intiMainMenuRendering, renderMainMenu, selectMainMenu, setMainCameraPosition, spawnPlayerContinueGame } from './states/mainMenu/mainMenuRendering'
import { disablePortrait, enableFullscreen, resize, setupGame, stopOnLosingFocus } from './states/setup/setupGame'
import { UI, errors } from './ui/UI'

coreState
	.addPlugins(hierarchyPlugin, physicsPlugin, transformsPlugin, addToScene('camera', 'light', 'model', 'dialogContainer', 'emitter', 'interactionContainer', 'minigameContainer', 'healthBarContainer', 'dashDisplay', 'stun', 'debuffsContainer', 'weaponArc', 'questMarkerContainer'), updateModels, particlesPlugin)
	.onEnter(initThree, initCamera, moveCamera(true))
	.onEnter(() => ui.render(UI), initHowler)
	.addSubscriber(...target, resize, disablePortrait, enableFullscreen, stopOnLosingFocus)
	.onPreUpdate(coroutines.tick, savePlayerFromTheEmbraceOfTheVoid)
	.onUpdate(runIf(() => !pausedState.enabled, updateAnimations('enemyAnimator', 'playerAnimator', 'chestAnimator', 'houseAnimator', 'ovenAnimator', 'basketAnimator', 'kayAnimator'), () => time.tick()))
	.onUpdate(inputManager.update, ui.update, moveCamera())
	.enable()
setupState
	.onEnter(setupGame)
	.enable()

gameState
	.addPlugins(debugPlugin, fishingPlugin)

	.addSubscriber(initializeCameraPosition, bobItems, enableInventoryState, killAnimation, popItems, addHealthBarContainer, ...equip('wateringCan', 'weapon', 'fishingPole'), ...doorLocking, addDashDisplay, addQuestMarkers)
	.onUpdate(
		runIf(canPlayerMove, movePlayer, updateDashDisplay),
		runIf(() => !pausedState.enabled, playerSteps, dayNight, updateTimeUniforms, applyDeathTimer, () => gameTweens.update(time.elapsed)),
		runIf(() => !openMenuState.enabled, pauseGame, interact),
	)
	.addPlugins(playerBehaviorPlugin, rangeEnemyBehaviorPlugin, chargingEnemyBehaviorPlugin, meleeEnemyBehaviorPlugin, beeBossBehaviorPlugin, jumpingEnemyBehaviorPlugin, basketBehaviorPlugin, sporeBehaviorPlugin)
	.onUpdate(collectItems(), touchItem, talkToNPC, turnNPCHead, stopItems, dropBerriesOnHit, updateWeaponArc)
	.onPostUpdate(renderGame, rotateStun)
	.enable()
mainMenuState
	.onEnter(intiMainMenuRendering, setMainCameraPosition)
	.onUpdate(renderMainMenu, selectMainMenu)
	.addSubscriber(clickOnMenuButton, initMainMenuCamPos)
	.onExit(removeStateEntity(mainMenuState), spawnPlayerContinueGame)
campState
	.addSubscriber(...interactablePlantableSpot)
	.onEnter(spawnFarm, spawnLevelData, initPlantableSpotsInteractions, spawnGodRay, addBeanStalkHole)
	.onEnter(runIf(() => !mainMenuState.enabled, spawnCharacter), moveCamera(true))
	.onUpdate(collideWithDoorCamp, playNightMusic, waterCrops, growCrops, growMagicBean, harvestMagicBean)
	.onUpdate(runIf(canPlayerMove, plantSeed, harvestCrop, openPlayerInventory, savePlayerPosition))
	.onExit(despawnOfType('map'))
openMenuState
	.onEnter(stopPlayer)
	.addSubscriber(disableInventoryState)
	.onExit()
	.onUpdate(closePlayerInventory)
genDungeonState
	.addSubscriber(unlockDoorClearing)
	.onEnter(spawnCrossRoad, spawnLevelData, spawnPlayerClearing, spawnWeaponsChoice, moveCamera(true))
	.onUpdate(collideWithDoorClearing)
	.onExit(despawnOfType('map'))

dungeonState
	.addSubscriber(spawnDrops, losingBattle, removeEnemyFromSpawn, applyArchingForce, unlockDungeon)
	.onEnter(spawnDungeon, spawnLevelData, generatenavGrid, spawnEnemies, spawnPlayerDungeon, moveCamera(true))
	.onUpdate(
		runIf(canPlayerMove, allowDoorCollision, collideWithDoor, harvestCrop, killEntities),
		runIf(() => !pausedState.enabled, tickHitCooldown, tickModifiers('speed', 'attackSpeed'), tickSneeze, tickPoison, tickInactiveTimer, tickSleepy),
	)
	.onUpdate(detroyProjectiles, honeySplat, stepInHoney, endBattleSpawnChest, spawnPoisonTrail)
	.onPostUpdate(buyItems)
	.onExit(despawnOfType('map'))
pausedState
	.onEnter(() => time.stop(), musicManager.pause)
	.onExit(() => time.start(), musicManager.play)

const animate = () => {
	try {
		app.update()
	} catch (e) {
		errors.push(JSON.stringify(e))
	}
	requestAnimationFrame(animate)
}

animate()
