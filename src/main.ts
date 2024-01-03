import { registerSW } from 'virtual:pwa-register'
import { addDebugCollider } from './debug/debugCollider'
import { playAnimations } from './global/animations'
import { initCamera, moveCamera } from './global/camera'
import { coroutines, inputManager, time, ui } from './global/init'
import { initThree, render, updateControls } from './global/rendering'
import { app, campState, coreState, dungeonState, gameState, genDungeonState, openMenuState, pausedState, setupState } from './global/states'
import { despawnOfType, hierarchyPlugin } from './lib/hierarchy'
import { updateModels } from './lib/modelsProperties'
import { physicsPlugin } from './lib/physics'
import { addToScene } from './lib/registerComponents'
import { runIf } from './lib/state'
import { runif } from './lib/systemset'
import { transformsPlugin } from './lib/transforms'
import { uiPlugin } from './lib/uiPlugin'
import { startTweens, updateTweens } from './lib/updateTween'
import { playerAttack } from './states/dungeon/battle'
import { enemyAttackPlayer } from './states/dungeon/enemies'
import { generateDungeon } from './states/dungeon/generateDungeon'
import { killAnimation, killEntities } from './states/dungeon/health'
import { spawnItems } from './states/dungeon/itemRoom'
import { displayOnCuttinBoard } from './states/farm/CookingUi'
import { closeCauldronInventory, openCauldronInventory } from './states/farm/cooking'
import { addCropModel, harvestCrop, plantSeed, saveCrops, spawnCrops } from './states/farm/farming'
import { closeInventory, openInventory, toggleMenuState } from './states/farm/openInventory'
import { spawnNPC } from './states/farm/spawnNPC'
import { talkToNPC } from './states/game/dialog'
import { bobItems, collectItems } from './states/game/items'
import { applyMove, canPlayerMove, movePlayer, savePlayerPosition } from './states/game/movePlayer'
import { pauseGame } from './states/game/pauseGame'
import { target } from './states/game/sensor'
import { spawnCharacter } from './states/game/spawnCharacter'
import { allowDoorCollision, collideWithDoor, collideWithDoorCamp } from './states/game/spawnDoor'
import { spawnSkyBox } from './states/game/spawnGround'
import { spawnDungeon, spawnFarm } from './states/game/spawnLevel'
import { spawnLight } from './states/game/spawnLights'
import { touchItem } from './states/game/touchItem'
import { setupGame } from './states/setup/setupGame'
import { menuManager } from './ui/Menu'
import { UI } from './ui/UI'

registerSW({ immediate: true })
coreState
	.addPlugins(hierarchyPlugin, physicsPlugin, transformsPlugin, addToScene('camera', 'light', 'mesh', 'model', 'dialogContainer'), updateModels, uiPlugin)
	.addSubscriber(...target, startTweens, addDebugCollider)
	.onEnter(initThree, initCamera, ui.render(UI))
	.onPreUpdate(coroutines.tick)
	.onUpdate(runIf(() => !pausedState.enabled, playAnimations, () => time.tick()), moveCamera, updateTweens, inputManager.update, ui.update, menuManager.update)
	.onPostUpdate(updateControls, render)
	.enable()
setupState
	.onEnter(setupGame)
	.enable()
gameState
	.onEnter()
	.addSubscriber(bobItems, ...toggleMenuState, killAnimation)
	.onUpdate(runIf(
		canPlayerMove,
		movePlayer,
		applyMove,
	))
	.onUpdate(collectItems, touchItem, talkToNPC, pauseGame)
	.enable()
campState
	.addSubscriber(addCropModel, ...saveCrops)
	.onEnter(spawnFarm, spawnCharacter, spawnLight, spawnSkyBox, spawnCrops, spawnNPC)
	.onUpdate(collideWithDoorCamp, savePlayerPosition, displayOnCuttinBoard)
	.onUpdate(runif(
		canPlayerMove,
		plantSeed,
		harvestCrop,
		openCauldronInventory,
		openInventory,
	))
	.onExit(despawnOfType('map'))
openMenuState
	.onUpdate(closeInventory, closeCauldronInventory)

genDungeonState
	.onEnter(generateDungeon)
dungeonState
	.onEnter(spawnDungeon, spawnLight, spawnSkyBox, spawnItems)
	.onUpdate(runIf(canPlayerMove, allowDoorCollision, collideWithDoor, enemyAttackPlayer, harvestCrop, playerAttack, killEntities))
	.onExit(despawnOfType('map'))
pausedState.onExit(() => time.reset())
const animate = async () => {
	app.update()
	requestAnimationFrame(animate)
}

animate()