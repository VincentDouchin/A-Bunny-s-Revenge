import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import 'vfonts/FiraCode.css'

const root = document.getElementById('root')!
const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.mount(root)
