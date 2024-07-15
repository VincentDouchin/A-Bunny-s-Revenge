import { basketBehaviorPlugin } from './behaviors/basketBehavior'
import { beeBossBehaviorPlugin } from './behaviors/beeBossBehavior'
import { chargingEnemyBehaviorPlugin, chargingTwiceEnemyBehaviorPlugin, jumpingEnemyBehaviorPlugin, meleeEnemyBehaviorPlugin, rangeEnemyBehaviorPlugin, rangeThriceEnemyBehaviorPlugin, sporeBehaviorPlugin } from './behaviors/enemyBehavior'
import { playerBehaviorPlugin } from './behaviors/playerBehavior'
import { debugPlugin } from './debug/debugPlugin'
import { updateAnimations } from './global/animations'
import { initCamera, initializeCameraPosition, moveCamera } from './global/camera'
import { coroutines, gameTweens, inputManager, musicManager, time, ui } from './global/init'
import { tickModifiersPlugin } from './global/modifiers'
import { updateMousePosition } from './global/mousePosition'
import { compileShaders, initThree, renderGame } from './global/rendering'
import { initHowler } from './global/sounds'
import { app, campState, coreState, dungeonState, gameState, genDungeonState, mainMenuState, openMenuState, pausedState, ruinsIntro, setupState } from './global/states'
import { despawnOfType, hierarchyPlugin, removeStateEntity } from './lib/hierarchy'
import { updateModels } from './lib/modelsProperties'
import { particlesPlugin } from './lib/particles'
import { physicsPlugin } from './lib/physics'
import { addToScene } from './lib/registerComponents'
import { runIf } from './lib/state'
import { transformsPlugin } from './lib/transforms'
import { spawnGodRay } from './shaders/godrays'
import { applyArchingForce, detroyProjectiles, honeySplat, sleepyEffects, stepInHoney, tickPoison, tickSleepy, tickSneeze } from './states/dungeon/attacks'
import { applyDeathTimer, tickHitCooldown } from './states/dungeon/battle'
import { dropBerriesOnHit } from './states/dungeon/bushes'
import { buyItems } from './states/dungeon/buyItems'
import { spawnWeaponsChoice } from './states/dungeon/chooseWeapon'
import { removeEnemyFromSpawn, spawnEnemies, tickInactiveTimer, unlockDungeon } from './states/dungeon/enemies'
import { killAnimation, killEntities, setInitialHealth } from './states/dungeon/health'
import { addHealthBarContainer } from './states/dungeon/healthBar'
import { lockOnEnemy } from './states/dungeon/locking'
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
import { addQuestMarkers, talkToNPC, triggerDialog, turnNPCHead } from './states/game/dialog'
import { equip } from './states/game/equip'
import { bobItems, collectItems, popItems, stopItems } from './states/game/items'
import { canPlayerMove, movePlayer, playerSteps, savePlayerFromTheEmbraceOfTheVoid, savePlayerPosition, stopPlayer } from './states/game/movePlayer'
import { pauseGame } from './states/game/pauseGame'
import { allowDoorCollision, collideWithDoorCamp, collideWithDoorClearing, collideWithDoorDungeon, collideWithDoorRuins, doorLocking, unlockDoorClearing, unlockDoorDungeon } from './states/game/spawnDoor'
import { spawnCrossRoad, spawnDungeon, spawnFarm, spawnLevelData, spawnRuins, updateTimeUniforms } from './states/game/spawnLevel'
import { losingBattle, spawnCharacter, spawnPlayerClearing, spawnPlayerDungeon } from './states/game/spawnPlayer'
import { interactionPlugin } from './states/game/touchItem'
import { updateWeaponArc } from './states/game/weapon'
import { startIntro } from './states/intro/startIntro'
import { clickOnMenuButton, initMainMenuCamPos, intiMainMenuRendering, renderMainMenu, selectMainMenu, setMainCameraPosition, spawnPlayerContinueGame } from './states/mainMenu/mainMenuRendering'
import { disablePortrait, enableFullscreen, resize, setupGame, stopOnLosingFocus } from './states/setup/setupGame'
import { UI, errors } from './ui/UI'

coreState
	.addPlugins(hierarchyPlugin, transformsPlugin, physicsPlugin, addToScene('camera', 'light', 'model', 'dialogContainer', 'emitter', 'interactionContainer', 'minigameContainer', 'healthBarContainer', 'dashDisplay', 'stun', 'debuffsContainer', 'weaponArc', 'questMarkerContainer', 'lockedOn'), updateModels, particlesPlugin)
	.onEnter(initThree, initCamera, moveCamera(true))
	.onEnter(() => ui.render(UI), initHowler)
	.addSubscriber(resize, disablePortrait, enableFullscreen, stopOnLosingFocus)
	.onPreUpdate(() => time.tick(), coroutines.tick, savePlayerFromTheEmbraceOfTheVoid, updateMousePosition())
	.onUpdate(runIf(() => !pausedState.enabled, updateAnimations('playerAnimator', 'basketAnimator', 'enemyAnimator', 'ovenAnimator', 'houseAnimator', 'chestAnimator', 'kayAnimator')))
	.onUpdate(inputManager.update, ui.update, moveCamera())
	.enable()
setupState
	.onEnter(setupGame)
	.enable()

gameState
	.addPlugins(debugPlugin, fishingPlugin, interactionPlugin, tickModifiersPlugin('speed', 'maxHealth', 'strength', 'critChance', 'critDamage', 'attackSpeed', 'lootQuantity', 'lootChance'))

	.addSubscriber(initializeCameraPosition, bobItems, enableInventoryState, killAnimation, popItems, addHealthBarContainer, ...equip('wateringCan', 'weapon', 'fishingPole'), ...doorLocking, addDashDisplay, addQuestMarkers)
	.onPreUpdate(stopItems)
	.onPreUpdate(runIf(() => !pausedState.enabled, () => gameTweens.update(time.elapsed)))
	.onUpdate(
		runIf(canPlayerMove, movePlayer, updateDashDisplay),
		runIf(() => !pausedState.enabled, playerSteps, dayNight, updateTimeUniforms, applyDeathTimer, triggerDialog),
		runIf(() => !openMenuState.enabled, pauseGame),
	)
	.addPlugins(playerBehaviorPlugin, rangeEnemyBehaviorPlugin, chargingEnemyBehaviorPlugin, meleeEnemyBehaviorPlugin, beeBossBehaviorPlugin, jumpingEnemyBehaviorPlugin, basketBehaviorPlugin, sporeBehaviorPlugin, chargingTwiceEnemyBehaviorPlugin, rangeThriceEnemyBehaviorPlugin)
	.onUpdate(collectItems(), talkToNPC, turnNPCHead, dropBerriesOnHit, updateWeaponArc, sleepyEffects)
	.onPostUpdate(renderGame, rotateStun, runIf(() => !openMenuState.enabled, interact))
	.enable()
mainMenuState
	.onEnter(intiMainMenuRendering, setMainCameraPosition)
	.onUpdate(renderMainMenu, selectMainMenu)
	.addSubscriber(clickOnMenuButton, initMainMenuCamPos)
	.onExit(removeStateEntity(mainMenuState), spawnPlayerContinueGame)
openMenuState
	.onEnter(stopPlayer)
	.addSubscriber(disableInventoryState)
	.onExit()
	.onUpdate(closePlayerInventory)
campState
	.addSubscriber(...interactablePlantableSpot)
	.onEnter(spawnFarm, spawnLevelData, initPlantableSpotsInteractions, spawnGodRay, addBeanStalkHole)
	.onEnter(runIf(() => mainMenuState.disabled, spawnCharacter, setInitialHealth), moveCamera(true))
	.onEnter(compileShaders)
	.onUpdate(collideWithDoorCamp, playNightMusic, waterCrops, growCrops, growMagicBean, harvestMagicBean)
	.onUpdate(runIf(canPlayerMove, plantSeed, harvestCrop, openPlayerInventory, savePlayerPosition))
	.onExit(despawnOfType('map'))
ruinsIntro
	.onEnter(spawnRuins, spawnLevelData, moveCamera(true), startIntro)
	.onEnter(compileShaders)
	.onUpdate(collideWithDoorRuins)
	.onExit(despawnOfType('map'))
genDungeonState
	.addSubscriber(unlockDoorClearing)
	.onEnter(spawnCrossRoad, spawnLevelData, spawnPlayerClearing, setInitialHealth, spawnWeaponsChoice, moveCamera(true))
	.onEnter(compileShaders)
	.onUpdate(collideWithDoorClearing)
	.onExit(despawnOfType('map'))

dungeonState
	.addSubscriber(spawnDrops, losingBattle, removeEnemyFromSpawn, applyArchingForce, unlockDungeon)
	.onEnter(spawnDungeon, spawnLevelData, spawnEnemies, spawnPlayerDungeon, moveCamera(true))
	.onEnter(compileShaders)
	.onUpdate(
		runIf(canPlayerMove, allowDoorCollision, collideWithDoorDungeon, harvestCrop, killEntities, unlockDoorDungeon),
		runIf(() => !pausedState.enabled, tickHitCooldown, tickSneeze, tickPoison, tickInactiveTimer, tickSleepy),
	)
	.onUpdate(detroyProjectiles, honeySplat, stepInHoney, endBattleSpawnChest, spawnPoisonTrail, lockOnEnemy, buyItems)
	.onExit(despawnOfType('map'))
pausedState
	.onEnter(() => time.stop(), musicManager.pause)
	.onExit(() => time.start(), musicManager.play)

const animate = () => {
	try {
		app.update()
	} catch (e) {
		console.error(e)
		errors.push(JSON.stringify(e))
	}
	requestAnimationFrame(animate)
}

animate()
