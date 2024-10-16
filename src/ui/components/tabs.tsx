import type { JSXElement } from 'solid-js'
import type { Atom } from 'solid-use/atom'
import { ui } from '@/global/init'
import { createEffect, createMemo, For, Show } from 'solid-js'
import { createArray } from 'solid-proxies'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { InputIcon } from '../InputIcon'
import { useGame } from '../store'
import { type MenuDir, menuItem } from './Menu'

menuItem
interface TabsProps<T extends string> {
	tabs: T[]
	selectedTab: Atom<T>
	children: (tab: T, selected: boolean) => JSXElement
	menu: MenuDir
}
export const Tabs = <T extends string,>(props: TabsProps<T>) => {
	const context = useGame()
	const tabsRefs = createArray<HTMLElement>([])
	ui.updateSync(() => {
		if (context?.player().menuInputs.get('tab').justPressed || context?.player().menuInputs.get('tabRight').justPressed) {
			const nextTab = (props.tabs.indexOf(props.selectedTab()) + 1) % props.tabs.length
			props.menu.setSelectedRef(tabsRefs[nextTab])
		}
		if (context?.player().menuInputs.get('tabLeft').justPressed) {
			const nextTab = (props.tabs.indexOf(props.selectedTab()) - 1)
			props.menu.setSelectedRef(tabsRefs.at(nextTab)!)
		}
	})

	css/* css */`
	.tab{
		position: absolute;
		display: grid;
		place-items: center;
		height: 100%;
	}
	.tab-right{
		left: 100%;
	}
	.tab-left{
		right: 100%;
	}
	`
	return (
		<Show when={context?.player()}>
			{(player) => {
				return (
					<>
						<div class="tab tab-left">
							<Show when={context?.usingKeyboard()}>
								<InputIcon input={player().menuInputs.get('tab')} size={3} />
							</Show>
							<Show when={context?.usingGamepad()}>
								<InputIcon input={player().menuInputs.get('tabLeft')} size={3} />
							</Show>
						</div>
						<For each={props.tabs}>
							{(tab, i) => {
								const isSelected = createMemo(() => props.selectedTab() === tab)
								const selected = atom(i() === 0)
								createEffect(() => {
									if (selected()) {
										props.selectedTab(tab)
									}
								})
								return (
									<div
										use:menuItem={[props.menu, isSelected(), selected, () => isSelected() ? [] : ['down', 'up'], false]}
										ref={el => tabsRefs[i()] = el}
									>
										{props.children(tab, selected())}
									</div>
								)
							}}
						</For>
						<div class="tab tab-right">
							<Show when={context?.usingGamepad()}>
								<InputIcon input={player().menuInputs.get('tabRight')} size={3} />
							</Show>
						</div>
					</>
				)
			}}
		</Show>
	)
}