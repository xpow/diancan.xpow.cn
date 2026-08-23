import { createRouter, createWebHashHistory } from 'vue-router'
import { readCart } from './utils/cart'

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
    { path: '/review', name: 'review', component: () => import('./pages/ReviewPage.vue') },
    { path: '/share', name: 'share', component: () => import('./pages/SharePage.vue') },
  ],
})

router.beforeEach((to) => {
  if (to.path === '/checkout' && readCart().length === 0) {
    return '/menu'
  }
})

router.afterEach((to, from) => {
  if (from.name) sessionStorage.setItem(`scroll-${from.path}`, String(window.scrollY))
  const saved = sessionStorage.getItem(`scroll-${to.path}`)
  if (saved) { requestAnimationFrame(() => window.scrollTo(0, Number(saved))) }
})

export default router
