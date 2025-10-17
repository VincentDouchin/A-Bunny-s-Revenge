import { AmbientLight, Group, OrthographicCamera, Quaternion, Scene, Vector3 } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { degToRad } from 'three/src/math/MathUtils'
import { Animator } from '@/global/animator'
import { RenderGroup } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { once } from '@/utils/mapFunctions'

export interface Conversation {
	actor: Array<{
		name: string
		model: keyof typeof assets['characters']
		position: 'left' | 'right'
		scale?: number
		animation?: string
	}>
	dialog: Array<{
		emote?: keyof typeof assets['emotes']['emotes']
		fr: string
		en: string
		speaker: string
	}>
}

export const conversationQuery = ecs.with('conversation')
const dialogRenderGroupQuery = ecs.with('group', 'renderGroup', 'scene').where(e => e.renderGroup === RenderGroup.Dialog)
export const setupDialogRenderGroup = once(() => {
	const scene = new Scene()
	const group = new Group()
	scene.add(group)
	const dialogRenderGroup = ecs.add({
		renderGroup: RenderGroup.Dialog,
		scene,
		group,
	})
	const ratio = 300
	const camera = new OrthographicCamera(
		-window.innerWidth / ratio,
		window.innerWidth / ratio,
		window.innerHeight / ratio,
		-window.innerHeight / ratio,
	)
	ecs.add({
		camera,
		position: new Vector3(0, 0, 15),
		cameraOffset: new Vector3(),
		parent: dialogRenderGroup,
		renderGroup: RenderGroup.Dialog,
	})
	camera.lookAt(new Vector3(0, 0, 0))
	ecs.add({
		parent: dialogRenderGroup,
		light: new AmbientLight(0xFFFFFF, 2),
		position: new Vector3(),
	})
})

export const validateConversation = (conversation: Conversation) => {
	for (const actor of conversation.actor) {
		if (!(actor.model in assets.characters)) {
			throw new Error(`Unknown model : ${actor.model}`)
		}
		if (actor.animation && !assets.characters[actor.model].animations.some(animation => actor.animation === animation.name)) {
			throw new Error(`Unknown animation : ${actor.animation} for model ${actor.model} \n Possible animations: ${assets.characters[actor.model].animations.map(a => a.name).join(' / ')}`)
		}
		if (!['left', 'right'].includes(actor.position)) {
			throw new Error(`wrong placement : ${actor.position}`)
		}
		if (!('name' in actor)) {
			throw new Error(`missing name for ${JSON.stringify(actor)}`)
		}
	}
	for (const line of conversation.dialog) {
		if (!conversation.actor.some(actor => line.speaker === actor.name)) {
			throw new Error(`Unknown speaker : ${line.speaker}`)
		}
		if (line.emote && !(line.emote in assets.emotes.emotes)) {
			throw new Error(`Unknown emote : ${line.emote}`)
		}
	}
}

const placement = {
	left: -1,
	right: 1,
} as const

const displayDialog = (dialog: Conversation) => {
	setupDialogRenderGroup()
	const renderGroup = dialogRenderGroupQuery.first
	if (!renderGroup) return
	for (const actor of dialog.actor) {
		const model = clone(assets.characters[actor.model].scene)
		model.scale.setScalar(2.2 * (actor.scale ?? 1))

		const actorEntity = ecs.add({
			parent: renderGroup,
			model,
			position: new Vector3(3 * placement[actor.position], -2, 0),
			rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), degToRad(-55 * placement[actor.position])),
		})
		if (actor.animation) {
			const animator = new Animator(model, assets.characters[actor.model].animations)
			ecs.update(actorEntity, { animator })
			animator.playAnimation(actor.animation)
		}
		const unsub = conversationQuery.onEntityRemoved.subscribe(() => {
			ecs.remove(actorEntity)
			unsub()
		})
	}
}
export const setupConversation = () => conversationQuery.onEntityAdded.subscribe((e) => {
	displayDialog(e.conversation)
})
