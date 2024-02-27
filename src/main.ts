import { debugPlugin } from './debug/debugPlugin'
import { updateAnimations } from './global/animations'
import { initCamera, initializeCameraPosition, moveCamera } from './global/camera'
import { coroutines, inputManager, time, ui } from './global/init'
import { initThree, preCompileShaders, render, updateControls } from './global/rendering'
import { initTone, playAmbiance } from './global/sounds'
import { app, campState, coreState, dungeonState, gameState, genDungeonState, openMenuState, pausedState, setupState } from './global/states'
import { despawnOfType, hierarchyPlugin } from './lib/hierarchy'
import { updateModels } from './lib/modelsProperties'
import { particlesPlugin } from './lib/particles'
import { physicsPlugin } from './lib/physics'
import { addToScene } from './lib/registerComponents'
import { runIf } from './lib/state'
import { transformsPlugin } from './lib/transforms'
import { tweenPlugin } from './lib/updateTween'
import { enemyAttackPlayer, playerAttack, spawnDrops } from './states/dungeon/battle'
import { generateDungeon } from './states/dungeon/generateDungeon'
import { killAnimation, killEntities } from './states/dungeon/health'
import { endBattleSpawnChest } from './states/dungeon/spawnChest'
import { harvestCrop, initPlantableSpotsInteractions, interactablePlantableSpot, plantSeed, updateCropsSave } from './states/farm/farming'
import { closePlayerInventory, disableInventoryState, enableInventoryState, interact, openPlayerInventory } from './states/farm/openInventory'
import { dayNight } from './states/game/dayNight'
import { talkToNPC } from './states/game/dialog'
import { bobItems, collectItems, popItems, stopItems } from './states/game/items'
import { applyMove, canPlayerMove, movePlayer, playerSteps, savePlayerPosition } from './states/game/movePlayer'
import { pauseGame } from './states/game/pauseGame'
import { beeFSM, ovenFSM, pandaFSM, playerFSM, shagaFSM } from './states/game/playerFSM'
import { target } from './states/game/sensor'
import { allowDoorCollision, collideWithDoor, collideWithDoorCamp } from './states/game/spawnDoor'
import { spawnDungeon, spawnFarm, spawnLevelData, updateTimeUniforms } from './states/game/spawnLevel'
import { losingBattle, spawnCharacter } from './states/game/spawnPlayer'
import { spawnSkyBox } from './states/game/spawnSkyBox'
import { touchItem } from './states/game/touchItem'
import { setupGame } from './states/setup/setupGame'
import { UI } from './ui/UI'

coreState
	.addPlugins(debugPlugin)
	.addPlugins(hierarchyPlugin, physicsPlugin, transformsPlugin, addToScene('camera', 'light', 'mesh', 'model', 'dialogContainer', 'batchRenderer', 'emitter', 'interactionContainer', 'minigameContainer'), updateModels, particlesPlugin, tweenPlugin)
	.addSubscriber(...target, preCompileShaders, initTone)
	.onEnter(initCamera, initThree, ui.render(UI))
	.onPreUpdate(coroutines.tick)
	.onUpdate(runIf(() => !pausedState.enabled, updateAnimations('beeAnimator', 'playerAnimator', 'pandaAnimator', 'shagaAnimator', 'ovenAnimator', 'chestAnimator'), () => time.tick()), inputManager.update, ui.update, moveCamera)
	.onPostUpdate(updateControls, render)
	.enable()
setupState
	.onEnter(setupGame)
	.enable()
gameState
	.onEnter()
	.addSubscriber(initializeCameraPosition, bobItems, enableInventoryState, killAnimation, ...playerFSM, ...pandaFSM, ...beeFSM, ...shagaFSM, ...ovenFSM, popItems)
	.onUpdate(runIf(canPlayerMove, movePlayer), runIf(() => !pausedState.enabled, applyMove, playerSteps, dayNight, updateTimeUniforms))
	.onUpdate(collectItems, touchItem, talkToNPC, stopItems, runIf(() => !openMenuState.enabled, pauseGame, interact))
	.enable()
campState
	.addSubscriber(...interactablePlantableSpot, playAmbiance('Farm_Ambience_Loop'))
	.onEnter(spawnFarm, spawnLevelData, updateCropsSave, initPlantableSpotsInteractions, spawnCharacter, spawnSkyBox)
	.onUpdate(collideWithDoorCamp)
	.onUpdate(runIf(canPlayerMove, plantSeed, harvestCrop, openPlayerInventory, savePlayerPosition))
	.onExit(despawnOfType('map'))
openMenuState
	.addSubscriber(disableInventoryState)
	.onUpdate(closePlayerInventory)
genDungeonState
	.onEnter(generateDungeon)
dungeonState
	.addSubscriber(spawnDrops, losingBattle, endBattleSpawnChest)
	.onEnter(spawnDungeon, spawnSkyBox, spawnLevelData)
	.onUpdate(runIf(canPlayerMove, allowDoorCollision, collideWithDoor, enemyAttackPlayer, harvestCrop, playerAttack, killEntities))
	.onExit(despawnOfType('map'))
pausedState
	.onExit(() => time.reset())

const animate = async () => {
	app.update()
	requestAnimationFrame(animate)
}

animate()
