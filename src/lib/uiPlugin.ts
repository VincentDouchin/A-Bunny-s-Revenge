import { render } from 'solid-js/web'
import { ecs } from '@/global/init'
import type { State } from '@/lib/state'

// ! Root
const spawnUiRoot = () => {
	const el = document.createElement('div')
	document.body.appendChild(el)
	el.style.position = 'fixed'
	el.style.inset = '0'
	ecs.add({
		el,
		uiRoot: true,
	})
}
const uiRootQuery = ecs.with('el', 'uiRoot')

// ! Add element
const withoutElQuery = ecs.with('template').without('el')
const addElement = () => withoutElQuery.onEntityAdded.subscribe((entity) => {
	const el = document.createElement('div')
	if (uiRootQuery.first) {
		uiRootQuery.first.el.appendChild(el)
	}
	render(entity.template, el)
})

declare module 'solid-js' {
	// eslint-disable-next-line ts/no-namespace
	namespace JSX {
		interface Directives {
			css2dObject: string
		}
	}
}

// ! Plugin
export const uiPlugin = (state: State) => {
	state
		.addSubscriber(addElement)
		.onEnter(spawnUiRoot)
}