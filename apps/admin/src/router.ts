import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/orders' },
    { path: '/night-markets', name: 'night-markets', component: () => import('./views/NightMarkets.vue') },
    { path: '/orders', name: 'orders', component: () => import('./views/Orders.vue') },
    { path: '/promotions', name: 'promotions', component: () => import('./views/Promotions.vue') },
    { path: '/users', name: 'users', component: () => import('./views/Users.vue') },
    { path: '/kitchen', name: 'kitchen', meta: { hideLayout: true }, component: () => import('./views/kitchen.vue') },
  ],
})

export default router
