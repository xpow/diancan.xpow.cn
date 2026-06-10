import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/main.css'
import 'vant/lib/index.css'
import { initTheme } from './utils/theme'

initTheme()

const app = createApp(App)
app.use(router)
app.mount('#app')
