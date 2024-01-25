import { debugPlugin } from './debug/debugPlugin'
import { updateAnimations } from './global/animations'
import { initCamera, moveCamera } from './global/camera'
import { coroutines, inputManager, time, ui } from './global/init'
import { initThree, render, updateControls } from './global/rendering'
import { app, campState, coreState, dungeonState, gameState, genDungeonState, openMenuState, pausedState, setupState } from './global/states'
import { despawnOfType, hierarchyPlugin } from './lib/hierarchy'
import { updateModels } from './lib/modelsProperties'
import { particlesPlugin, updateParticles } from './lib/particles'
import { physicsPlugin } from './lib/physics'
import { addToScene } from './lib/registerComponents'
import { runIf } from './lib/state'
import { runif } from './lib/systemset'
import { transformsPlugin } from './lib/transforms'
import { startTweens, updateTweens } from './lib/updateTween'
import { playerAttack, spawnDrops } from './states/dungeon/battle'
import { enemyAttackPlayer } from './states/dungeon/enemies'
import { generateDungeon } from './states/dungeon/generateDungeon'
import { killAnimation, killEntities } from './states/dungeon/health'
import { spawnItems } from './states/dungeon/itemRoom'
import { displayOnCuttinBoard } from './states/farm/CookingUi'
import { growCrops, harvestCrop, initPlantableSpotsInteractions, interactablePlantableSpot, plantSeed, updateCropsSave } from './states/farm/farming'
import { closeMenu, closePlayerInventory, disableInventoryState, enableInventoryState, openMenu, openPlayerInventory } from './states/farm/openInventory'
import { spawnChest } from './states/farm/spawnChest'
import { spawnNPC } from './states/farm/spawnNPC'
import { talkToNPC } from './states/game/dialog'
import { bobItems, collectItems } from './states/game/items'
import { applyMove, canPlayerMove, movePlayer, savePlayerPosition } from './states/game/movePlayer'
import { pauseGame } from './states/game/pauseGame'
import { pandaFSM, playerFSM } from './states/game/playerFSM'
import { target } from './states/game/sensor'
import { spawnCharacter } from './states/game/spawnCharacter'
import { allowDoorCollision, collideWithDoor, collideWithDoorCamp } from './states/game/spawnDoor'
import { spawnSkyBox } from './states/game/spawnGround'
import { spawnDungeon, spawnFarm } from './states/game/spawnLevel'
import { spawnLight } from './states/game/spawnLights'
import { showInteraction, touchItem } from './states/game/touchItem'
import { setupGame } from './states/setup/setupGame'
import { UI } from './ui/UI'

coreState
	.addPlugins(debugPlugin)
	.addPlugins(hierarchyPlugin, physicsPlugin, transformsPlugin, addToScene('camera', 'light', 'mesh', 'model', 'dialogContainer', 'batchRenderer', 'emitter', 'interactionContainer'), updateModels, particlesPlugin)
	.addSubscriber(...target, startTweens)
	.onEnter(initCamera, initThree, ui.render(UI))
	.onPreUpdate(coroutines.tick, moveCamera)
	.onUpdate(runIf(() => !pausedState.enabled, updateAnimations('beeAnimator', 'playerAnimator', 'pandaAnimator'), () => time.tick()), updateTweens, inputManager.update, ui.update, updateParticles)
	.onPostUpdate(updateControls, render)
	.enable()
setupState
	.onEnter(setupGame)
	.enable()
gameState
	.onEnter()
	.addSubscriber(bobItems, enableInventoryState, killAnimation, ...showInteraction, ...playerFSM, ...pandaFSM)
	.onUpdate(runIf(canPlayerMove, movePlayer), runIf(() => !pausedState.enabled, applyMove))
	.onUpdate(collectItems, touchItem, talkToNPC, runIf(() => !openMenuState.enabled, pauseGame))
	.enable()
campState
	.addSubscriber(...interactablePlantableSpot)
	.onEnter(growCrops, spawnFarm, updateCropsSave, initPlantableSpotsInteractions, spawnCharacter, spawnLight, spawnSkyBox, spawnNPC, spawnChest)
	.onUpdate(collideWithDoorCamp, displayOnCuttinBoard)
	.onUpdate(runif(canPlayerMove, plantSeed, harvestCrop, openMenu, openPlayerInventory), savePlayerPosition)
	.onExit(despawnOfType('map'))
openMenuState
	.addSubscriber(disableInventoryState)
	.onUpdate(closePlayerInventory, closeMenu)

genDungeonState
	.onEnter(generateDungeon)
dungeonState
	.addSubscriber(spawnDrops)
	.onEnter(spawnDungeon, spawnLight, spawnSkyBox, spawnItems)
	.onUpdate(runIf(canPlayerMove, allowDoorCollision, collideWithDoor, enemyAttackPlayer, harvestCrop, playerAttack, killEntities))
	.onExit(despawnOfType('map'))
pausedState
	.onExit(() => time.reset())

const animate = async () => {
	app.update()
	requestAnimationFrame(animate)
}

animate()