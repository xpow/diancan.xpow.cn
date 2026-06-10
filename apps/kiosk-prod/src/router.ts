import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/welcome', redirect: '/home' },
    { path: '/home', name: 'home', component: () => import('./pages/WelcomePage.vue') },
    { path: '/menu', name: 'menu', component: () => import('./pages/MenuPage.vue') },
    { path: '/checkout', name: 'checkout', component: () => import('./pages/CheckoutPage.vue') },
    { path: '/pickup', name: 'pickup', component: () => import('./pages/PickupPage.vue') },
    { path: '/orders', redirect: '/pickup' },
  ],
})

export default router
