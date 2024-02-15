import { debugPlugin } from './debug/debugPlugin'
import { updateAnimations } from './global/animations'
import { initCamera, initializeCameraPosition, moveCamera } from './global/camera'
import { coroutines, inputManager, time, ui } from './global/init'
import { initThree, preCompileShaders, render, updateControls } from './global/rendering'
import { app, campState, coreState, dungeonState, gameState, genDungeonState, openMenuState, pausedState, setupState } from './global/states'
import { despawnOfType, hierarchyPlugin } from './lib/hierarchy'
import { updateModels } from './lib/modelsProperties'
import { particlesPlugin, updateParticles } from './lib/particles'
import { physicsPlugin } from './lib/physics'
import { addToScene } from './lib/registerComponents'
import { runIf } from './lib/state'
import { transformsPlugin } from './lib/transforms'
import { startTweens, updateTweens } from './lib/updateTween'
import { enemyAttackPlayer, playerAttack, spawnDrops } from './states/dungeon/battle'
import { generateDungeon } from './states/dungeon/generateDungeon'
import { killAnimation, killEntities } from './states/dungeon/health'
import { spawnItems } from './states/dungeon/itemRoom'
import { harvestCrop, initPlantableSpotsInteractions, interactablePlantableSpot, plantSeed, updateCropsSave } from './states/farm/farming'
import { closeMenu, closePlayerInventory, disableInventoryState, enableInventoryState, openMenu, openPlayerInventory } from './states/farm/openInventory'
import { talkToNPC } from './states/game/dialog'
import { bobItems, collectItems, popItems, stopItems } from './states/game/items'
import { applyMove, canPlayerMove, movePlayer, playerSteps, savePlayerPosition } from './states/game/movePlayer'
import { pauseGame } from './states/game/pauseGame'
import { beeFSM, ovenFSM, pandaFSM, playerFSM, shagaFSM } from './states/game/playerFSM'
import { target } from './states/game/sensor'
import { losingBattle, spawnCharacter } from './states/game/spawnCharacter'
import { allowDoorCollision, collideWithDoor, collideWithDoorCamp } from './states/game/spawnDoor'
import { spawnSkyBox } from './states/game/spawnSkyBox'
import { spawnDungeon, spawnFarm, spawnLevelData } from './states/game/spawnLevel'
import { showInteraction, touchItem } from './states/game/touchItem'
import { setupGame } from './states/setup/setupGame'
import { UI } from './ui/UI'
import { initTone } from './global/sounds'

coreState
	.addPlugins(debugPlugin)
	.addPlugins(hierarchyPlugin, physicsPlugin, transformsPlugin, addToScene('camera', 'light', 'mesh', 'model', 'dialogContainer', 'batchRenderer', 'emitter', 'interactionContainer', 'minigameContainer'), updateModels, particlesPlugin)
	.addSubscriber(...target, startTweens, preCompileShaders, initTone)
	.onEnter(initCamera, initThree, ui.render(UI))
	.onPreUpdate(coroutines.tick)
	.onUpdate(runIf(() => !pausedState.enabled, updateAnimations('beeAnimator', 'playerAnimator', 'pandaAnimator', 'shagaAnimator', 'ovenAnimator'), () => time.tick()), updateTweens, inputManager.update, ui.update, updateParticles, moveCamera)
	.onPostUpdate(updateControls, render)
	.enable()
setupState
	.onEnter(setupGame)
	.enable()
gameState
	.onEnter()
	.addSubscriber(initializeCameraPosition, bobItems, enableInventoryState, killAnimation, ...showInteraction, ...playerFSM, ...pandaFSM, ...beeFSM, ...shagaFSM, ...ovenFSM, popItems)
	.onUpdate(runIf(canPlayerMove, movePlayer), runIf(() => !pausedState.enabled, applyMove, playerSteps))
	.onUpdate(collectItems, touchItem, talkToNPC, stopItems, runIf(() => !openMenuState.enabled, pauseGame))
	.enable()
campState
	.addSubscriber(...interactablePlantableSpot)
	.onEnter(spawnFarm, spawnLevelData, updateCropsSave, initPlantableSpotsInteractions, spawnCharacter, spawnSkyBox)
	.onUpdate(collideWithDoorCamp)
	.onUpdate(runIf(canPlayerMove, plantSeed, harvestCrop, openMenu, openPlayerInventory), savePlayerPosition)
	.onExit(despawnOfType('map'))
openMenuState
	.addSubscriber(disableInventoryState)
	.onUpdate(closePlayerInventory, closeMenu)

genDungeonState
	.onEnter(generateDungeon)
dungeonState
	.addSubscriber(spawnDrops, losingBattle)
	.onEnter(spawnDungeon, spawnSkyBox, spawnItems, spawnLevelData)
	.onUpdate(runIf(canPlayerMove, allowDoorCollision, collideWithDoor, enemyAttackPlayer, harvestCrop, playerAttack, killEntities))
	.onExit(despawnOfType('map'))
pausedState
	.onExit(() => time.reset())

const animate = async () => {
	app.update()
	requestAnimationFrame(animate)
}

animate()
