import { playAnimations } from './global/animations'
import { initCamera, moveCamera } from './global/camera'
import { time, ui } from './global/init'
import { initThree, render, updateControls } from './global/rendering'
import { app, campState, coreState, dungeonState, gameState, genDungeonState, openMenuState, setupState } from './global/states'
import { despawnOfType, hierarchyPlugin } from './lib/hierarchy'
import { InputMap } from './lib/inputs'
import { updateModels } from './lib/modelsProperties'
import { physicsPlugin } from './lib/physics'
import { addToScene } from './lib/registerComponents'
import { runIf } from './lib/state'
import { runif } from './lib/systemset'
import { transformsPlugin } from './lib/transforms'
import { uiPlugin } from './lib/uiPlugin'
import { startTweens, updateTweens } from './lib/updateTween'
import { generateDungeon } from './states/dungeon/generateDungeon'
import { spawnItems } from './states/dungeon/itemRoom'
import { closeCauldronInventory, openCauldronInventory } from './states/farm/cooking'
import { addCropModel, harvestCrop, plantSeed, spawnCrops } from './states/farm/farming'
import { closeInventory, openInventory, toggleMenuState } from './states/farm/openInventory'
import { spawnNPC } from './states/farm/spawnNPC'
import { talkToNPC } from './states/game/dialog'
import { bobItems, collectItems } from './states/game/items'
import { movePlayer } from './states/game/movePlayer'
import { target } from './states/game/sensor'
import { spawnCharacter } from './states/game/spawnCharacter'
import { allowDoorCollision, collideWithDoor, collideWithDoorCamp } from './states/game/spawnDoor'
import { enemyAttackPlayer } from './states/game/spawnEnemy'
import { spawnSkyBox } from './states/game/spawnGround'
import { spawnDungeon, spawnFarm } from './states/game/spawnLevel'
import { spawnLight } from './states/game/spawnLights'
import { touchItem } from './states/game/touchItem'
import { setupGame } from './states/setup/setupGame'
import { UI } from './ui/UI'

coreState
	.addPlugins(hierarchyPlugin, physicsPlugin, transformsPlugin, addToScene('camera', 'light', 'mesh', 'model', 'dialogContainer'), updateModels, uiPlugin)
	.addSubscriber(...target, startTweens)
	.onEnter(initThree, initCamera, ui.render(UI))
	.onUpdate(...playAnimations('playerAnimator'), moveCamera, updateTweens, InputMap.update, ui.update)
	.onPostUpdate(updateControls, render)
	.enable()
setupState
	.onEnter(setupGame)
	.enable()
gameState
	.onEnter()
	.addSubscriber(bobItems, ...toggleMenuState)
	.onUpdate(runIf(() => !openMenuState.enabled, movePlayer), collectItems, touchItem, talkToNPC)
	.enable()
campState
	.addSubscriber(addCropModel)
	.onEnter(spawnFarm, spawnCharacter, spawnLight, spawnSkyBox, spawnCrops, spawnNPC)
	.onUpdate(collideWithDoorCamp, runif(() => !openMenuState.enabled, plantSeed, harvestCrop, openCauldronInventory, openInventory))
	.onExit(despawnOfType('map'))
openMenuState
	.onUpdate(closeInventory, closeCauldronInventory)

genDungeonState
	.onEnter(generateDungeon)
dungeonState
	.onEnter(spawnDungeon, spawnLight, spawnSkyBox, spawnItems)
	.onUpdate(allowDoorCollision, collideWithDoor, enemyAttackPlayer)
	.onExit(despawnOfType('map'))

const animate = async () => {
	time.tick()
	app.update()
	requestAnimationFrame(animate)
}

animate()