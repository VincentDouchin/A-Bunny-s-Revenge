import { beeBossBehavior } from './behaviors/beeBossBehavior'
import { chargingBehavior, jumpingBehavior, meleeBehavior, mushroomBehavior, rangeBehavior, seedlingBehavior, sporeBehavior } from './behaviors/enemyBehavior'
import { playerBehavior } from './behaviors/playerBehavior'
import { pumpkinBossPlugin } from './behaviors/pumpkinBossBehavior'
import { updateStates } from './behaviors/state'
import { setupConversation } from './conversation/setupConversation'
import { debugPlugin } from './debug/debugPlugin'
import { updateAnimations } from './global/animations'
import { initCamera, initializeCameraPosition, moveCamera } from './global/camera'
import { coroutines, inputManager, musicManager, questManager, resetSave, thumbnailRenderer, time, tweens, ui } from './global/init'
import { tickModifiersPlugin } from './global/modifiers'
import { updateMousePosition } from './global/mousePosition'
import { compileShaders, initTexturesItemsAndEnemies, initThree, renderGame } from './global/rendering'
import { initHowler, playAmbience } from './global/sounds'
import { app } from './global/states'
import { runIf } from './lib/app'
import { addToScene, deSpawnOfType, hierarchyPlugin, removeStateEntityPlugin } from './lib/hierarchy'
import { particlesPlugin } from './lib/particles'
import { physicsPlugin, stepWorld } from './lib/physics'
import { transformsPlugin } from './lib/transforms'
import { enableCutscene, introQuestActors, spawnIntroPlayer, startIntro } from './quests/introQuest'
import { addQuestMarkers, completeQuestStep, displayUnlockQuestToast } from './quests/questHelpers'
import { spawnGodRay } from './shaders/godrays'
import { applyArchingForce, destroyProjectiles, honeySplat, sleepyEffects, stepInHoney, tickPoison, tickSleepy, tickSneeze } from './states/dungeon/attacks'
import { applyDeathTimer, tickHitCooldown } from './states/dungeon/battle'
import { dropBerriesOnHit } from './states/dungeon/bushes'
import { buyItems } from './states/dungeon/buyItems'
import { spawnWeaponsChoice } from './states/dungeon/chooseWeapon'
import { removeEnemyFromSpawn, spawnEnemies, tickInactiveTimer, unlockDungeon } from './states/dungeon/enemies'
import { setInitialHealth } from './states/dungeon/health'
import { addHealthBarContainer } from './states/dungeon/healthBar'
import { lockOnEnemy } from './states/dungeon/locking'
import { spawnDrops } from './states/dungeon/lootPool'
import { spawnPoisonTrail } from './states/dungeon/poisonTrail'
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
import { spawnCharacter, spawnPlayerClearing, spawnPlayerContinueGame, spawnPlayerDungeon } from './states/game/spawnPlayer'
import { interactionPlugin } from './states/game/touchItem'
import { updateWeaponArc } from './states/game/weapon'
import { intiMainMenuRendering } from './states/mainMenu/initMainMenu'
import { clickOnMenuButton, initMainMenuCamPos, renderMainMenu, selectMainMenu, setupWindow } from './states/mainMenu/mainMenuRendering'
import { disablePortrait, enableFullscreen, resize, setupGame, stopOnLosingFocus } from './states/setup/setupGame'
import { UI } from './ui/UI'

app
	.onInit(async () => {
		await app.enable('default')
	})
	// ! DEFAULT
	.addPlugins(debugPlugin, hierarchyPlugin, transformsPlugin, physicsPlugin, addToScene('camera', 'light', 'model', 'dialogContainer', 'emitter', 'interactionContainer', 'miniGameContainer', 'healthBarContainer', 'dashDisplay', 'stun', 'debuffsContainer', 'weaponArc', 'questMarkerContainer', 'lockedOn'), particlesPlugin, removeStateEntityPlugin)
	.onEnter('default', initThree, initCamera)
	.onEnter('default', initHowler, initTexturesItemsAndEnemies)
	.addSubscribers('default', () => ui.render(UI), resize, disablePortrait, enableFullscreen, stopOnLosingFocus, completeQuestStep)
	.onPreUpdate('default', coroutines.tick, savePlayerFromTheEmbraceOfTheVoid, updateMousePosition(), moveCamera())
	.onUpdate('default', runIf(() => app.isDisabled('paused'), ...updateAnimations('playerAnimator', 'basketAnimator', 'enemyAnimator', 'ovenAnimator', 'houseAnimator', 'chestAnimator', 'kayAnimator', 'cellarDoorAnimator', 'pumpkinBossAnimator', 'explodeAnimator', 'pumpkinSeedAnimator', 'animator')))
	.onRender('default', renderGame)
	.onRender('default', runIf(() => app.isDisabled('paused'), stepWorld))
	.onPreUpdate('default', inputManager.update, ui.update)
	.onRender('default', runIf(() => app.isDisabled('paused'), updateTimeUniforms))
	.onUpdate('default', () => thumbnailRenderer.update(time.delta))
	.onPreUpdate('default', runIf(() => app.isDisabled('paused'), time.tick, dayNight, tweens.tick))
	// !SETUP
	.onEnter('default', setupGame)
	// ! GAME
	.addPlugins(fishingPlugin, interactionPlugin, tickModifiersPlugin('speed', 'maxHealth', 'strength', 'critChance', 'critDamage', 'attackSpeed', 'lootQuantity', 'lootChance'))
	.addSubscribers('game', initializeCameraPosition, bobItems, enableInventoryState, popItems, addHealthBarContainer, ...equip('wateringCan', 'weapon', 'fishingPole'), ...doorLocking, addDashDisplay, addQuestMarkers, displayUnlockQuestToast, setupConversation)
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
		runIf(() => app.isEnabled('intro'), () => resetSave(questManager), startIntro),
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
	.onEnter('clearing', initTexturesItemsAndEnemies, compileShaders)
	.onUpdate('clearing', collideWithDoorClearing)
	// ! DUNGEON
	.addSubscribers('dungeon', spawnDrops, removeEnemyFromSpawn, applyArchingForce, unlockDungeon)
	.onEnter('dungeon', spawnDungeon, spawnLevelData, spawnPlayerDungeon, moveCamera(true), spawnEnemies)
	.onUpdate('game', runIf(
		() => app.isDisabled('paused') && app.isDisabled('menu'),
		seedlingBehavior,
		meleeBehavior,
		chargingBehavior,
		jumpingBehavior,
		sporeBehavior,
		rangeBehavior,
		beeBossBehavior,
		playerBehavior,
		mushroomBehavior,
		...updateStates('playerState', 'enemyState', 'beeBossState', 'pumpkinBossState', 'pumpkinSeedState', 'fishState', 'mushroomState'),
	))
	.addPlugins(pumpkinBossPlugin)
	.onEnter('dungeon', compileShaders, initTexturesItemsAndEnemies)
	.onUpdate(
		'dungeon',
		runIf(canPlayerMove, allowDoorCollision, collideWithDoorDungeon, harvestCrop, unlockDoorDungeon),
		runIf(() => app.isDisabled('paused'), tickHitCooldown, tickSneeze, tickPoison, tickInactiveTimer, tickSleepy),
	)
	.onUpdate('dungeon', destroyProjectiles, honeySplat, stepInHoney, spawnPoisonTrail, lockOnEnemy, buyItems)
	.onExit('dungeon', deSpawnOfType('map'))
	// ! PAUSED
	.onEnter('paused', () => time.stop(), musicManager.pause)
	.onExit('paused', () => time.start(), musicManager.play)
	// ! VILLAGE
	.onEnter('village', spawnLevel('village', 'village'), spawnLevelData, spawnCharacter, moveCamera(true))
	.onEnter('village', compileShaders, initTexturesItemsAndEnemies)
	.onUpdate('village', collideWithDoorVillage)
	.addPlugins(introQuestActors('game'))
	.start()
