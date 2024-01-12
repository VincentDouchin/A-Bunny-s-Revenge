import type { JSONEditorOptions } from 'jsoneditor'
import JSONEditor from 'jsoneditor'
import { createSignal, onCleanup, onMount } from 'solid-js'
import saveDataSchema from '@/debug/saveDataSchema.json'
import type { SaveData } from '@/global/save'
import { resetSave, save } from '@/global/save'
import { ecs } from '@/global/init'

const playerControlsQuery = ecs.with('playerControls')

const theme = `<link href="https://cdnjs.cloudflare.com/ajax/libs/jsoneditor/10.0.0/jsoneditor.min.css" rel="stylesheet" type="text/css">`
export const SaveEditor = () => {
	const [el, setEl] = createSignal<HTMLDivElement>()
	const [json, setJson] = createSignal<SaveData>(save)
	onMount(() => {
		if (!document.head.innerHTML.includes(theme))
			document.head.innerHTML += theme
		const options: JSONEditorOptions = {
			theme: 'bootstrap4',
			schema: saveDataSchema,
			mode: 'code',
			limitDragging: true,
			onChangeText: (text: string) => setJson(JSON.parse(text) as SaveData),
			allowSchemaSuggestions: true,
			modes: ['code', 'tree'],
		}
		const editor = new JSONEditor(el()!, options)
		editor.set(json())
		onCleanup(() => {
			editor.destroy()
		})
		const player = playerControlsQuery.first
		if (player) {
			const controls = player.playerControls
			ecs.removeComponent(player, 'playerControls')
			onCleanup(() => {
				ecs.addComponent(player, 'playerControls', controls)
			})
		}
	})

	const saveChanges = () => {
		resetSave(json())
		window.location.reload()
	}
	return (

		<div
			style={{ position: 'fixed', right: 0, top: 0, width: '800px', background: 'white', color: 'black', height: '100vh' }}
		>
			<button onClick={saveChanges}>save changes</button>
			<div style={{ height: '100%' }} ref={setEl}></div>
		</div>
	)
}