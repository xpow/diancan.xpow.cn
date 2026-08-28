import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', meta: { hideLayout: true, noAuth: true }, component: () => import('./views/Login.vue') },
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', name: 'dashboard', component: () => import('./views/Dashboard.vue') },
    { path: '/orders', name: 'orders', component: () => import('./views/Orders.vue') },
    { path: '/menu', name: 'menu', component: () => import('./views/Menu.vue') },
    { path: '/promotions', name: 'promotions', component: () => import('./views/Promotions.vue') },
    { path: '/merchant', name: 'merchant', component: () => import('./views/Merchant.vue') },
    { path: '/devices', name: 'devices', component: () => import('./views/Devices.vue') },
    { path: '/kitchen-terminals', name: 'kitchenTerminals', component: () => import('./views/KitchenTerminals.vue') },
    { path: '/users', name: 'users', component: () => import('./views/Users.vue') },
    { path: '/kitchen', name: 'kitchen', meta: { hideLayout: true, noAuth: true }, component: () => import('./views/kitchen.vue') },
    { path: '/k/:token', name: 'kterminal', meta: { hideLayout: true, noAuth: true }, component: () => import('./views/kitchen.vue') },
    { path: '/stats', name: 'stats', component: () => import('./views/Stats.vue') },
    { path: '/cost-profit', name: 'costProfit', component: () => import('./views/CostProfit.vue') },
    { path: '/reviews', name: 'reviews', component: () => import('./views/ReviewManagement.vue') },
  ],
})

router.beforeEach(async (to, _from, next) => {
  if (to.meta?.noAuth) return next()
  try {
    const res = await fetch('/api/admin/auth/check')
    const data = await res.json()
    if (data.authed) return next()
  } catch {}
  next('/login')
})

export default router
