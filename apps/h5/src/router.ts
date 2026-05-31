import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', name: 'home', component: () => import('./pages/home.vue') },
    { path: '/menu', name: 'menu', component: () => import('./pages/menu.vue') },
    { path: '/checkout', name: 'checkout', component: () => import('./pages/checkout.vue') },
    { path: '/pickup', name: 'pickup', component: () => import('./pages/pickup.vue') },
  ],
})

export default router
