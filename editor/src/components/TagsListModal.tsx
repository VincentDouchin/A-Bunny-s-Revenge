import type { tags } from '@assets/tagsList'
import type { Atom } from 'solid-use/atom'
import { faCheck, faTags, faTrash } from '@fortawesome/free-solid-svg-icons'
import Fa from 'solid-fa'
import { For } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { Modal } from './Modal'

export function TagsListModal({ tagsList, saveTagsList }: {
	tagsList: Atom<tags[]>
	saveTagsList: (tags: tags[]) => void
}) {
	const open = atom(false)
	const newTag = atom('')
	css/* css */`
	.tags-trigger{
		position: absolute;
		right: 0;
	}
	.new-tag{
		display: grid;
		grid-template-columns: 1fr auto;
	}
	`
	return (
		<Modal
			trigger={(
				<button onClick={() => open(!open())} class="tags-trigger">
					<Fa icon={faTags}></Fa>
				</button>
			)}

			open={open}
		>
			<For each={tagsList()}>
				{tag => (
					<div>
						{tag}
						<button onClick={() => saveTagsList(tagsList().filter(t => t !== tag))}>
							<Fa icon={faTrash}></Fa>
						</button>
					</div>
				)}
			</For>
			<div class="new-tag">
				<input value={newTag()} onChange={e => newTag(e.target.value)}></input>
				<button onClick={() => saveTagsList([...tagsList(), newTag() as tags])}>
					<Fa icon={faCheck}></Fa>
				</button>
			</div>
		</Modal>
	)
}