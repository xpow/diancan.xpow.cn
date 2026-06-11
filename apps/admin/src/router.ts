import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', name: 'dashboard', component: () => import('./views/Dashboard.vue') },
    { path: '/orders', name: 'orders', component: () => import('./views/Orders.vue') },
    { path: '/menu', name: 'menu', component: () => import('./views/Menu.vue') },
    { path: '/promotions', name: 'promotions', component: () => import('./views/Promotions.vue') },
    { path: '/merchant', name: 'merchant', component: () => import('./views/Merchant.vue') },
    { path: '/users', name: 'users', component: () => import('./views/Users.vue') },
    { path: '/kitchen', name: 'kitchen', meta: { hideLayout: true }, component: () => import('./views/kitchen.vue') },
  ],
})

export default router
