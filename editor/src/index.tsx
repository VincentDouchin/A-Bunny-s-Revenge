import { render } from 'solid-js/web'
import { Editor } from './Editor.tsx'
import './index.css'

const root = document.getElementById('root')

render(() => {
	return <Editor />
}, root!)
