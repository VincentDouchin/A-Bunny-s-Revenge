import type { Atom } from 'solid-use/atom'
import atom from 'solid-use/atom'

interface DebugOptions {
	attackInFarm: Atom<boolean>
	godMode: Atom<boolean>
}
export const debugOptions: DebugOptions = {
	attackInFarm: atom(false),
	godMode: atom(false),

}
