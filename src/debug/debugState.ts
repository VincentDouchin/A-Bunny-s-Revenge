import type { Atom } from 'solid-use/atom'
import { app } from '@/global/states'
import atom from 'solid-use/atom'

interface DebugOptions {
	attackInFarm: Atom<boolean>
	godMode: Atom<boolean>
}
export const debugOptions: DebugOptions = {
	attackInFarm: atom(false),
	godMode: atom(false),

}

export const debugState = app.create()
export const editorState = app.create()