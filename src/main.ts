import { playAnimations } from './global/animations'
import { initCamera, moveCamera } from './global/camera'
import { time, ui } from './global/init'
import { initThree, render, updateControls } from './global/rendering'
import { app, campState, coreState, dungeonState, gameState, setupState } from './global/states'
import { despawnOfType, hierarchyPlugin } from './lib/hierarchy'
import { InputMap } from './lib/inputs'
import { updateModels } from './lib/modelsProperties'
import { physicsPlugin } from './lib/physics'
import { addToScene } from './lib/registerComponents'
import { transformsPlugin } from './lib/transforms'
import { uiPlugin } from './lib/uiPlugin'
import { startTweens, updateTweens } from './lib/updateTween'
import { addCropModel, harvestCrop, plantSeed, spawnCrops } from './states/farm/plantSeed'
import { bobItems, collectItems } from './states/game/items'
import { movePlayer } from './states/game/movePlayer'
import { spawnCharacter, spawnCharacterDungeon } from './states/game/spawnCharacter'
import { collideWithDoor, collideWithDoorCamp, spawnCampDoor, spawnDungeonDoors } from './states/game/spawnDoor'
import { enemyAttackPlayer, spawnEnemy } from './states/game/spawnEnemy'
import { spawnGround, spawnRocks, spawnSkyBox, spawnTrees } from './states/game/spawnGround'
import { spawnLight } from './states/game/spawnLights'
import { target } from './states/game/target'
import { setupGame } from './states/setup/setupGame'
import { UI } from './ui/UI'

coreState
	.addPlugins(hierarchyPlugin, physicsPlugin, transformsPlugin, addToScene('camera', 'light', 'mesh', 'model'), updateModels, uiPlugin)
	.addSubscriber(...target, startTweens)
	.onEnter(initThree(4), initCamera(false), ui.render(UI))
	.onUpdate(...playAnimations('playerAnimator'), moveCamera, updateTweens, InputMap.update, ui.update)
	.onPostUpdate(updateControls, render)
	.enable()
setupState
	.onEnter(setupGame)
	.enable()
gameState
	.onEnter()
	.addSubscriber(bobItems)
	.onUpdate(movePlayer, collectItems)
	.enable()
campState
	.addSubscriber(addCropModel)
	.onEnter(spawnGround(), spawnCharacter, spawnLight, spawnSkyBox, spawnTrees(), spawnRocks(), spawnCampDoor, spawnCrops)
	.onUpdate(collideWithDoorCamp, plantSeed, harvestCrop)
	.onExit(despawnOfType('map'))
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