import type { JSONEditorOptions } from 'jsoneditor'
import type { SaveData } from '@/global/save'
import JSONEditor from 'jsoneditor'
import { createSignal, onCleanup, onMount, Show } from 'solid-js'
import { unwrap } from 'solid-js/store'
import saveDataSchema from '@/debug/saveDataSchema.json'
import { questManager, resetSave, save } from '@/global/init'
import { app } from '@/global/states'
import { sleep } from '@/utils/sleep'

const theme = `<link href="https://cdnjs.cloudflare.com/ajax/libs/jsoneditor/10.0.0/jsoneditor.min.css" rel="stylesheet" type="text/css">`
export const SaveEditor = () => {
	const [show, setShow] = createSignal(false)
	const listener = (e: KeyboardEvent) => e.key === 'F3' && setShow(x => !x)
	onMount(() => document.body.addEventListener('keydown', listener))
	onCleanup(() => {
		document.body.removeEventListener('keydown', listener)
	})
	return (
		<Show when={show()}>
			{(_) => {
				const [el, setEl] = createSignal<HTMLDivElement>()

				onMount(() => {
					app.enable('debug')
					if (!document.head.innerHTML.includes(theme))
						document.head.innerHTML += theme
					const options: JSONEditorOptions = {
						schema: saveDataSchema,
						mode: 'tree',
						limitDragging: true,
						onChangeText: (text: string) => resetSave(questManager, JSON.parse(text) as SaveData),
						allowSchemaSuggestions: true,
						modes: ['code', 'tree'],
					}
					const editor = new JSONEditor(el()!, options)
					editor.set(unwrap(save))
					onCleanup(async () => {
						app.disable('debug')
						editor.destroy()
						app.disable('farm')
						await sleep(2000)
						app.enable('farm', { door: 'clearing' })
					})
				})

				return (

					<div
						style={{ position: 'fixed', right: 0, top: 0, width: '800px', background: 'white', color: 'black', height: '100vh' }}
					>
						<div style={{ height: '100%' }} ref={setEl}></div>
					</div>
				)
			}}
		</Show>
	)
}