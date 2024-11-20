import { beeBossBehaviorPlugin } from './behaviors/beeBossBehavior'
import { chargingEnemyBehaviorPlugin, chargingTwiceEnemyBehaviorPlugin, jumpingEnemyBehaviorPlugin, meleeEnemyBehaviorPlugin, rangeEnemyBehaviorPlugin, rangeThriceEnemyBehaviorPlugin, sporeBehaviorPlugin } from './behaviors/enemyBehavior'
import { playerBehaviorPlugin } from './behaviors/playerBehavior'
import { debugPlugin } from './debug/debugPlugin'
import { updateAnimations } from './global/animations'
import { initCamera, initializeCameraPosition, moveCamera } from './global/camera'
import { coroutines, inputManager, musicManager, questManager, resetSave, time, tweens, ui } from './global/init'
import { tickModifiersPlugin } from './global/modifiers'
import { updateMousePosition } from './global/mousePosition'
import { compileShaders, initTexturesItemsAndEnemies, initThree, renderGame } from './global/rendering'
import { initHowler, playAmbience } from './global/sounds'
import { app } from './global/states'
import { runIf } from './lib/app'
import { hierarchyPlugin, removeStateEntityPlugin } from './lib/hierarchy'
import { particlesPlugin } from './lib/particles'
import { physicsPlugin } from './lib/physics'
import { addToScene } from './lib/registerComponents'
import { transformsPlugin } from './lib/transforms'
import { enableCutscene, introQuest, introQuestActors, spawnIntroPlayer, startIntro } from './quests/introQuest'
import { addQuestMarkers, completeQuestStep, displayUnlockQuestToast } from './quests/questHelpers'
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
import { allowDoorCollision, collideWithDoorCamp, collideWithDoorClearing, collideWithDoorDungeon, collideWithDoorIntro, collideWithDoorVillage, doorLocking, unlockDoorClearing, unlockDoorDungeon } from './states/game/spawnDoor'
import { spawnDungeon, spawnLevel, spawnLevelData, updateTimeUniforms } from './states/game/spawnLevel'
import { spawnCharacter, spawnPlayerClearing, spawnPlayerDungeon } from './states/game/spawnPlayer'
import { interactionPlugin } from './states/game/touchItem'
import { updateWeaponArc } from './states/game/weapon'
import { intiMainMenuRendering } from './states/mainMenu/initMainMenu'
import { clickOnMenuButton, initMainMenuCamPos, renderMainMenu, selectMainMenu, setupWindow, spawnPlayerContinueGame } from './states/mainMenu/mainMenuRendering'
import { disablePortrait, enableFullscreen, resize, setupGame, stopOnLosingFocus } from './states/setup/setupGame'
import { UI } from './ui/UI'

introQuest

app
	.onInit(async () => {
		await app.enable('default')
	})
	// ! DEFAULT
	.addPlugins(debugPlugin, hierarchyPlugin, transformsPlugin, physicsPlugin, addToScene('camera', 'light', 'model', 'dialogContainer', 'emitter', 'interactionContainer', 'minigameContainer', 'healthBarContainer', 'dashDisplay', 'stun', 'debuffsContainer', 'weaponArc', 'questMarkerContainer', 'lockedOn'), particlesPlugin, removeStateEntityPlugin)
	.onEnter('default', initThree, initCamera)
	.onEnter('default', () => ui.render(UI), initHowler, initTexturesItemsAndEnemies)
	.addSubscribers('default', resize, disablePortrait, enableFullscreen, stopOnLosingFocus, completeQuestStep)
	.onPreUpdate('default', coroutines.tick, savePlayerFromTheEmbraceOfTheVoid, updateMousePosition())
	.onUpdate('default', runIf(() => app.isDisabled('paused'), ...updateAnimations('playerAnimator', 'basketAnimator', 'enemyAnimator', 'ovenAnimator', 'houseAnimator', 'chestAnimator', 'kayAnimator', 'cellarDoorAnimator')))
	.onPreUpdate('default', inputManager.update, ui.update, moveCamera())
	.onPreUpdate('default', runIf(() => app.isDisabled('paused'), time.tick, dayNight, updateTimeUniforms, tweens.tick))
	.onRender('default', renderGame)
	// !SETUP
	.onEnter('default', setupGame)
	// ! GAME
	.addPlugins(playerBehaviorPlugin, rangeEnemyBehaviorPlugin, chargingEnemyBehaviorPlugin, meleeEnemyBehaviorPlugin, beeBossBehaviorPlugin, jumpingEnemyBehaviorPlugin, sporeBehaviorPlugin, chargingTwiceEnemyBehaviorPlugin, rangeThriceEnemyBehaviorPlugin)
	.addPlugins(fishingPlugin, interactionPlugin, tickModifiersPlugin('speed', 'maxHealth', 'strength', 'critChance', 'critDamage', 'attackSpeed', 'lootQuantity', 'lootChance'))
	.addSubscribers('game', initializeCameraPosition, bobItems, enableInventoryState, killAnimation, popItems, addHealthBarContainer, ...equip('wateringCan', 'weapon', 'fishingPole'), ...doorLocking, addDashDisplay, addQuestMarkers, displayUnlockQuestToast)
	.onEnter('game', questManager.enableQuests)
	.onPreUpdate(
		'game',
		stopItems,
		runIf(canPlayerMove, movePlayer, updateDashDisplay),
		runIf(() => app.isDisabled('paused'), playerSteps, applyDeathTimer),
	)
	.onUpdate('game', collectItems(false), turnNPCHead, dropBerriesOnHit, updateWeaponArc, sleepyEffects)
	.onPostUpdate('game', rotateStun, runIf(() => app.isDisabled('menu'), interact))
	// ! MENU
	.onEnter('menu', stopPlayer)
	.addSubscribers('menu', disableInventoryState)
	.onUpdate('menu', closePlayerInventory)
	// ! FARM
	.addSubscribers('farm', ...interactablePlantableSpot)
	.onEnter('farm', spawnLevel('farm', 'farm'), spawnLevelData, initPlantableSpotsInteractions, spawnGodRay, compileShaders, initTexturesItemsAndEnemies)
	.onEnter('farm', runIf(() => app.isDisabled('mainMenu'), spawnCharacter, setInitialHealth), moveCamera(true))
	.onUpdate('farm', runIf(() => app.isDisabled('mainMenu'), playNightMusic, playAmbience))
	.onUpdate('farm', collideWithDoorCamp, waterCrops, growCrops)
	.onUpdate('farm', runIf(canPlayerMove, plantSeed, harvestCrop, openPlayerInventory))
	// ! MAIN MENU
	.onEnter('mainMenu', intiMainMenuRendering, setupWindow)
	.onRender('mainMenu', renderMainMenu)
	.onUpdate('mainMenu', selectMainMenu, clickOnMenuButton)
	.addSubscribers('mainMenu', ...initMainMenuCamPos)
	.onExit(
		'mainMenu',
		runIf(() => app.isEnabled('intro'), () => resetSave(), startIntro),
		runIf(() => app.isEnabled('farm'), spawnPlayerContinueGame),
	)
	// ! INTRO
	.onEnter('intro', spawnLevel('intro', 'intro'), spawnLevelData)
	.addPlugins(spawnIntroPlayer('intro'))
	.onEnter('intro')
	.onUpdate('intro', collideWithDoorIntro)
	.onUpdate('intro', runIf(() => app.isDisabled('mainMenu'), playAmbience))
	.addSubscribers('intro', enableCutscene)
	// ! CLEARING
	.addSubscribers('clearing', unlockDoorClearing)
	.onEnter('clearing', spawnLevel('crossroad', 'clearing'), spawnLevelData, spawnPlayerClearing, setInitialHealth, spawnWeaponsChoice, moveCamera(true))
	.onEnter('clearing')
	.onUpdate('clearing', collideWithDoorClearing)
	// ! DUNGEON
	.addSubscribers('dungeon', spawnDrops, removeEnemyFromSpawn, applyArchingForce, unlockDungeon)
	.onEnter('dungeon', spawnDungeon, spawnLevelData, spawnEnemies, spawnPlayerDungeon, moveCamera(true))
	.onEnter('dungeon', compileShaders, initTexturesItemsAndEnemies)
	.onEnter('dungeon')
	.onUpdate(
		'dungeon',
		runIf(canPlayerMove, allowDoorCollision, collideWithDoorDungeon, harvestCrop, killEntities, unlockDoorDungeon),
		runIf(() => app.isDisabled('paused'), tickHitCooldown, tickSneeze, tickPoison, tickInactiveTimer, tickSleepy),
	)
	.onUpdate('dungeon', detroyProjectiles, honeySplat, stepInHoney, endBattleSpawnChest, spawnPoisonTrail, lockOnEnemy, buyItems)
	// ! PAUSED
	.onEnter('paused', () => time.stop(), musicManager.pause)
	.onExit('paused', () => time.start(), musicManager.play)
	// ! VILLAGE
	.onEnter('village', spawnLevel('village', 'village'), spawnLevelData, spawnCharacter, moveCamera(true))
	.onEnter('village', compileShaders, initTexturesItemsAndEnemies)
	.onUpdate('village', collideWithDoorVillage)

	.addPlugins(introQuestActors('game'))
	.start()