import { playAnimations } from './global/animations'
import { initCamera, moveCamera } from './global/camera'
import { time, ui } from './global/init'
import { initThree, render, updateControls } from './global/rendering'
import { app, campState, coreState, dungeonState, gameState, openMenuState, setupState } from './global/states'
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
import { closeCauldronInventory, openCauldronInventory } from './states/farm/cooking'
import { addCropModel, harvestCrop, plantSeed, spawnCrops } from './states/farm/farming'
import { closeInventory, openInventory, toggleMenuState } from './states/farm/openInventory'
import { bobItems, collectItems } from './states/game/items'
import { movePlayer } from './states/game/movePlayer'
import { target } from './states/game/sensor'
import { spawnCharacter, spawnCharacterDungeon } from './states/game/spawnCharacter'
import { collideWithDoor, collideWithDoorCamp, spawnDungeonDoors } from './states/game/spawnDoor'
import { enemyAttackPlayer, spawnEnemy } from './states/game/spawnEnemy'
import { spawnGround, spawnRocks, spawnSkyBox, spawnTrees } from './states/game/spawnGround'
import { spawnLevel } from './states/game/spawnLevel'
import { spawnLight } from './states/game/spawnLights'
import { setupGame } from './states/setup/setupGame'
import { UI } from './ui/UI'

coreState
	.addPlugins(hierarchyPlugin, physicsPlugin, transformsPlugin, addToScene('camera', 'light', 'mesh', 'model'), updateModels, uiPlugin)
	.addSubscriber(...target, startTweens)
	.onEnter(initThree(4), initCamera, ui.render(UI))
	.onUpdate(...playAnimations('playerAnimator'), moveCamera, updateTweens, InputMap.update, ui.update)
	.onPostUpdate(updateControls, render)
	.enable()
setupState
	.onEnter(setupGame)
	.enable()
gameState
	.onEnter()
	.addSubscriber(bobItems, ...toggleMenuState)
	.onUpdate(runIf(() => !openMenuState.enabled, movePlayer), collectItems)
	.enable()
campState
	.addSubscriber(addCropModel)
	.onEnter(spawnLevel('farm'), spawnCharacter, spawnLight, spawnSkyBox, spawnCrops)
	.onUpdate(collideWithDoorCamp, runif(() => !openMenuState.enabled, plantSeed, harvestCrop, openCauldronInventory, openInventory))
	.onExit(despawnOfType('map'))
openMenuState
	.onUpdate(closeInventory, closeCauldronInventory)
dungeonState
	.onEnter(spawnGround(96), spawnLight, spawnSkyBox, spawnTrees(96, 30), spawnRocks(96, 30), spawnDungeonDoors, spawnCharacterDungeon, spawnEnemy(96, 5))
	.onUpdate(collideWithDoor, enemyAttackPlayer)
	.onExit(despawnOfType('map'))

const animate = async () => {
	time.tick()
	app.update()
	requestAnimationFrame(animate)
}

animate()