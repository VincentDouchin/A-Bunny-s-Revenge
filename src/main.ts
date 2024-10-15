import { beeBossBehaviorPlugin } from './behaviors/beeBossBehavior'
import { chargingEnemyBehaviorPlugin, chargingTwiceEnemyBehaviorPlugin, jumpingEnemyBehaviorPlugin, meleeEnemyBehaviorPlugin, rangeEnemyBehaviorPlugin, rangeThriceEnemyBehaviorPlugin, sporeBehaviorPlugin } from './behaviors/enemyBehavior'
import { playerBehaviorPlugin } from './behaviors/playerBehavior'
import { debugPlugin } from './debug/debugPlugin'
import { updateAnimations } from './global/animations'
import { initCamera, initializeCameraPosition, moveCamera } from './global/camera'
import { coroutines, inputManager, musicManager, resetSave, time, tweens, ui } from './global/init'
import { tickModifiersPlugin } from './global/modifiers'
import { updateMousePosition } from './global/mousePosition'
import { compileShaders, initThree, renderGame } from './global/rendering'
import { initHowler, playAmbience } from './global/sounds'
import { app, campState, coreState, dungeonState, gameState, genDungeonState, introQuest, introState, mainMenuState, openMenuState, pausedState, setupState } from './global/states'
import { despawnOfType, hierarchyPlugin, removeStateEntity } from './lib/hierarchy'
import { updateModels } from './lib/modelsProperties'
import { particlesPlugin } from './lib/particles'
import { physicsPlugin } from './lib/physics'
import { addToScene } from './lib/registerComponents'
import { runIf } from './lib/state'
import { transformsPlugin } from './lib/transforms'
import { enableCutscene, introQuestPlugin, spawnIntroPlayer, startIntro } from './quests/introQuest'
import { addQuestMarkers, enableQuests } from './quests/questHelpers'
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
import { growCrops, harvestCrop, initPlantableSpotsInteractions, interactablePlantableSpot, plantSeed } from './states/farm/farming'
import { fishingPlugin } from './states/farm/fishing'
import { closePlayerInventory, disableInventoryState, enableInventoryState, interact, openPlayerInventory } from './states/farm/openInventory'
import { waterCrops } from './states/farm/wateringCan'
import { addDashDisplay, updateDashDisplay } from './states/game/dash'
import { dayNight, playNightMusic } from './states/game/dayNight'
import { turnNPCHead } from './states/game/dialog'
import { equip } from './states/game/equip'
import { bobItems, collectItems, popItems, stopItems } from './states/game/items'
import { canPlayerMove, movePlayer, playerSteps, savePlayerFromTheEmbraceOfTheVoid, stopPlayer } from './states/game/movePlayer'
import { pauseGame } from './states/game/pauseGame'
import { allowDoorCollision, collideWithDoorCamp, collideWithDoorClearing, collideWithDoorDungeon, collideWithDoorIntro, doorLocking, unlockDoorClearing, unlockDoorDungeon } from './states/game/spawnDoor'
import { spawnDungeon, spawnLevel, spawnLevelData, updateTimeUniforms } from './states/game/spawnLevel'
import { spawnCharacter, spawnPlayerClearing, spawnPlayerDungeon } from './states/game/spawnPlayer'
import { interactionPlugin } from './states/game/touchItem'
import { updateWeaponArc } from './states/game/weapon'
import { intiMainMenuRendering } from './states/mainMenu/initMainMenu'
import { clickOnMenuButton, initMainMenuCamPos, renderMainMenu, selectMainMenu, setupWindow, spawnPlayerContinueGame } from './states/mainMenu/mainMenuRendering'
import { disablePortrait, enableFullscreen, resize, setupGame, stopOnLosingFocus } from './states/setup/setupGame'
import { UI, errors } from './ui/UI'

coreState
	.addPlugins(hierarchyPlugin, transformsPlugin, physicsPlugin, addToScene('camera', 'light', 'model', 'dialogContainer', 'emitter', 'interactionContainer', 'minigameContainer', 'healthBarContainer', 'dashDisplay', 'stun', 'debuffsContainer', 'weaponArc', 'questMarkerContainer', 'lockedOn'), updateModels, particlesPlugin)
	.onEnter(initThree, initCamera, moveCamera(true))
	.onEnter(() => ui.render(UI), initHowler)
	.addSubscriber(resize, disablePortrait, enableFullscreen, stopOnLosingFocus)
	.onPreUpdate(() => time.tick(), coroutines.tick, savePlayerFromTheEmbraceOfTheVoid, updateMousePosition())
	.onUpdate(runIf(() => !pausedState.enabled, updateAnimations('playerAnimator', 'basketAnimator', 'enemyAnimator', 'ovenAnimator', 'houseAnimator', 'chestAnimator', 'kayAnimator', 'cellarDoorAnimator')))
	.onUpdate(inputManager.update, ui.update, moveCamera())
	.enable()
setupState
	.onEnter(setupGame)
	.enable()

gameState
	.addPlugins(debugPlugin, fishingPlugin, interactionPlugin, tickModifiersPlugin('speed', 'maxHealth', 'strength', 'critChance', 'critDamage', 'attackSpeed', 'lootQuantity', 'lootChance'))
	.addSubscriber(initializeCameraPosition, bobItems, enableInventoryState, killAnimation, popItems, addHealthBarContainer, ...equip('wateringCan', 'weapon', 'fishingPole'), ...doorLocking, addDashDisplay, addQuestMarkers)
	.onEnter(enableQuests)
	.onPreUpdate(runIf(() => !pausedState.enabled, tweens.tick))
	.onPreUpdate(stopItems)
	.onPreUpdate(
		runIf(canPlayerMove, movePlayer, updateDashDisplay),
		runIf(() => !pausedState.enabled, playerSteps, dayNight, updateTimeUniforms, applyDeathTimer),
		runIf(() => !openMenuState.enabled, pauseGame),
	)
	.addPlugins(playerBehaviorPlugin, rangeEnemyBehaviorPlugin, chargingEnemyBehaviorPlugin, meleeEnemyBehaviorPlugin, beeBossBehaviorPlugin, jumpingEnemyBehaviorPlugin, sporeBehaviorPlugin, chargingTwiceEnemyBehaviorPlugin, rangeThriceEnemyBehaviorPlugin)
	.onUpdate(collectItems(false), turnNPCHead, dropBerriesOnHit, updateWeaponArc, sleepyEffects)
	.onPostUpdate(renderGame, rotateStun, runIf(() => !openMenuState.enabled, interact))
	.enable()

openMenuState
	.onEnter(stopPlayer)
	.addSubscriber(disableInventoryState)
	.onExit()
	.onUpdate(closePlayerInventory)
campState
	.addSubscriber(...interactablePlantableSpot)
	.onEnter(spawnLevel('farm'), spawnLevelData, initPlantableSpotsInteractions, spawnGodRay)
	.onEnter(runIf(() => mainMenuState.disabled, spawnCharacter, setInitialHealth), moveCamera(true))
	.onEnter(compileShaders)
	.onUpdate(runIf(() => mainMenuState.disabled, playNightMusic, playAmbience))
	.onUpdate(collideWithDoorCamp, waterCrops, growCrops)
	.onUpdate(runIf(canPlayerMove, plantSeed, harvestCrop, openPlayerInventory))
	.onExit(despawnOfType('map'))
mainMenuState
	.onEnter(intiMainMenuRendering, setupWindow)
	.onUpdate(renderMainMenu, selectMainMenu, clickOnMenuButton)
	.addSubscriber(...initMainMenuCamPos)
	.onExit(
		removeStateEntity(mainMenuState),
		runIf(() => introState.enabled, () => resetSave(), startIntro),
		runIf(() => campState.enabled, spawnPlayerContinueGame),
	)
introState
	.onEnter(spawnLevel('intro'), spawnLevelData)
	.addPlugins(spawnIntroPlayer)
	.onEnter(compileShaders, moveCamera(true))
	.onUpdate(collideWithDoorIntro)
	.onUpdate(runIf(() => mainMenuState.disabled, playAmbience))
	.addSubscriber(enableCutscene)
	.onExit(despawnOfType('map'))
genDungeonState
	.addSubscriber(unlockDoorClearing)
	.onEnter(spawnLevel('crossroad'), spawnLevelData, spawnPlayerClearing, setInitialHealth, spawnWeaponsChoice, moveCamera(true))
	.onEnter(compileShaders)
	.onUpdate(collideWithDoorClearing)
	.onExit(despawnOfType('map'))

dungeonState
	.addSubscriber(spawnDrops, removeEnemyFromSpawn, applyArchingForce, unlockDungeon)
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

introQuest.addPlugins(introQuestPlugin)

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
