import { AmbientLight, DirectionalLight, Group, OrthographicCamera, Quaternion, Scene, Vector3 } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { degToRad } from 'three/src/math/MathUtils'
import { Animator } from '@/global/animator'
import { EmoteContainer, RenderGroup } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { getBoundingBoxShape } from '@/lib/models'
import { once } from '@/utils/mapFunctions'

export interface ConversationLine {
	emote?: keyof typeof assets['emotes']['emotes']
	speaker: string
	fr: string
	en: string
	choice: Record<string, { fr: string, en: string }>
	next?: string
}
export interface Conversation {
	actor: Array<{
		name: string
		model: keyof typeof assets['characters']
		position: 'left' | 'right'
		scale?: number
		animation?: string
	}>
	dialog: {
		main: ConversationLine[]
		[key: string]: ConversationLine[]
	}
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
	const light = new DirectionalLight(0xFFFFFF, 0.6)
	light.position.setZ(-2)
	light.lookAt(new Vector3(0, 0, 0))
	light.castShadow = true

	ecs.add({
		parent: dialogRenderGroup,
		light,
		position: new Vector3(0, 50, 0),
	})
})

export const validateConversation = (conversation: Conversation) => {
	try {
		if (!conversation.dialog.main) {
			throw new Error('No starting point, please add a \"main\" branch')
		}
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
		for (const line of Object.values(conversation.dialog).flat()) {
			if (line.next && !(line.next in conversation.dialog)) {
				throw new Error(`the branch ${line.next} is not present in the dialog`)
			}
			if (!conversation.actor.some(actor => line.speaker === actor.name)) {
				throw new Error(`Unknown speaker : ${line.speaker}`)
			}
			if (line.emote && !(line.emote in assets.emotes.emotes)) {
				throw new Error(`Unknown emote : ${line.emote}`)
			}
			if (line.choice) {
				if (Object.keys(line.choice).length !== 2) {
					throw new Error('Only 2 choices are supported for now')
				}
				for (const choice in line.choice) {
					if (!(choice in conversation.dialog)) {
						throw new Error(`the branch ${choice} is not present in the dialog`)
					}
				}
			}
		}
	} catch (e: any) {
		// eslint-disable-next-line no-console
		console.log(conversation)
		throw new Error(e)
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
		const scale = 2.2 * (actor.scale ?? 1)
		model.scale.setScalar(scale)
		const emoteContainer = new EmoteContainer(actor.name)
		emoteContainer.position.y = getBoundingBoxShape('characters', actor.model).y * scale
		model.add(emoteContainer)
		const actorEntity = ecs.add({
			emoteContainer,
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
