import type { SaveData } from '@/global/save'
import type { JSONEditorOptions } from 'jsoneditor'
import saveDataSchema from '@/debug/saveDataSchema.json'
import { resetSave, save } from '@/global/init'
import { campState } from '@/global/states'
import { sleep } from '@/utils/sleep'
import JSONEditor from 'jsoneditor'
import { createSignal, onCleanup, onMount, Show } from 'solid-js'
import { unwrap } from 'solid-js/store'
import { debugState } from './debugState'

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
					debugState.enable()
					if (!document.head.innerHTML.includes(theme))
						document.head.innerHTML += theme
					const options: JSONEditorOptions = {
						schema: saveDataSchema,
						mode: 'tree',
						limitDragging: true,
						onChangeText: (text: string) => resetSave(JSON.parse(text) as SaveData),
						allowSchemaSuggestions: true,
						modes: ['code', 'tree'],
					}
					const editor = new JSONEditor(el()!, options)
					editor.set(unwrap(save))
					onCleanup(async () => {
						debugState.disable()
						editor.destroy()
						campState.disable()
						await sleep(2000)
						campState.enable({ door: 'clearing' })
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