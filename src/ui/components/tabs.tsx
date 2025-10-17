import type { JSXElement } from 'solid-js'
import type { Atom } from 'solid-use/atom'
import type { MenuItemComponent } from './Menu'
import { For, Show } from 'solid-js'
import { createArray } from 'solid-proxies'
import { css } from 'solid-styled'
import { menuInputs, ui } from '@/global/init'
import { InputIcon } from '../InputIcon'
import { useGame } from '../store'

interface TabsProps<T extends string> {
	tabs: T[]
	selectedTab: Atom<T>
	children: (tab: T, selected: boolean) => JSXElement
	MenuItem: MenuItemComponent
}
export const Tabs = <T extends string,>(props: TabsProps<T>) => {
	const context = useGame()
	const tabsRefs = createArray<HTMLElement>([])
	ui.updateSync(() => {
		if (menuInputs.get('tab').justPressed || menuInputs.get('tabRight').justPressed) {
			const nextTab = props.tabs[(props.tabs.indexOf(props.selectedTab()) + 1) % props.tabs.length]
			props.selectedTab(nextTab)
		}
		if (menuInputs.get('tabLeft').justPressed) {
			const nextTab = props.tabs[(props.tabs.indexOf(props.selectedTab()) - 1)]
			props.selectedTab(nextTab)
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
		<>
			<div class="tab tab-left">
				<Show when={context?.usingKeyboard()}>
					<InputIcon input={menuInputs.get('tab')} size={3} />
				</Show>
				<Show when={context?.usingGamepad()}>
					<InputIcon input={menuInputs.get('tabLeft')} size={3} />
				</Show>
			</div>
			<For each={props.tabs}>
				{(tab, i) => {
					return (
						<props.MenuItem onClick={() => props.selectedTab(tab)}>
							{({ selected }) => (
								<div
									ref={el => tabsRefs[i()] = el}
								>
									{props.children(tab, selected())}
								</div>
							)}
						</props.MenuItem>
					)
				}}
			</For>
			<div class="tab tab-right">
				<Show when={context?.usingGamepad()}>
					<InputIcon input={menuInputs.get('tabRight')} size={3} />
				</Show>
			</div>
		</>
	)
}