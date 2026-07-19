<template>
  <main class="share-page" v-if="menu">
    <header class="share-header">
      <img :src="logoImg" alt="logo" class="share-logo" />
      <h1 style="display: none;">{{ menu.merchant.name }}</h1>
    </header>

    <div class="share-hero">
      <h2>正宗炭火烧烤</h2>
      <p class="hero-sub-en">Authentic Charcoal Grilling</p>
      <div class="badge"><span class="badge-en">Master of the Flame</span></div>
    </div>

    <div class="promo-img-wrap">
      <img src="../assets/images/pages/unnamed.jpg" width="398" alt="" class="promo-img" />
      <div class="promo-overlay">
        <span class="promo-badge">人气推荐</span>
        <h3>招牌烤串 每日鲜供</h3>
      </div>
    </div>

    <div class="share-container">
      <section v-for="cat in sortedCategories" :key="cat.id" class="cat-section">
        <h3><span class="cat-bar" :style="{ background: catBarColor(cat.name) }"></span>{{ cat.name }}</h3>
        <div v-if="featuredDish(cat)" class="featured-card">
          <div class="featured-img">
            <img :src="dishImage(featuredDish(cat)!)" :alt="featuredDish(cat)!.name" @error="onImgError" />
          </div>
          <div class="featured-body">
            <div class="featured-header">
              <h4>{{ featuredDish(cat)!.name }}</h4>
              <span v-for="t in featuredDish(cat)!.tags" :key="t" class="dish-tag">{{ t }}</span>
            </div>
            <p>{{ featuredDish(cat)!.desc }}</p>
            <div class="featured-bottom">
              <span class="featured-price"><small class="c-sign">¥</small>{{ featuredDish(cat)!.price.toFixed(2) }}<span v-if="featuredDish(cat)!.portionSize" class="dish-h-portion"> / {{ featuredDish(cat)!.portionSize }}串</span></span>
            </div>
          </div>
        </div>
        <div v-if="normalDishes(cat).length" class="grid-2col">
          <div v-for="d in normalDishes(cat)" :key="d.id" class="grid-card">
            <div class="grid-card-top">
              <div class="grid-card-img">
                <img :src="dishImage(d)" :alt="d.name" @error="onImgError" />
              </div>
              <div class="grid-card-right">
                <span class="grid-price"><small class="c-sign">¥</small>{{ d.price.toFixed(2) }}</span>
                <h4>{{ d.name }}</h4>
                <p v-if="d.portionSize" class="grid-portion">{{ d.portionSize }}串/份</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div class="footer-section">
      <div class="glow"></div>
      <div class="footer-content">
        <h4>Ready to Order?</h4>
        <p>扫码下单，即刻享用。</p>
        <div class="qr-box">
          <img :src="qrDataUrl" alt="QR Code" v-if="qrDataUrl" />
          <div v-else class="qr-placeholder">QR</div>
        </div>
        <div class="footer-info">
          <span v-if="menu.branch.todayLocation">📍 {{ menu.branch.todayLocation }}</span>
          <span v-if="menu.branch.businessHours">🕐 {{ menu.branch.businessHours }}</span>
        </div>
      </div>
    </div>
  </main>
  <main v-else class="share-page loading-state">
    <p>加载中...</p>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
// @ts-ignore
import QRCode from 'qrcode'
import logoImg from '@/assets/images/pages/logo.jpg'
import { getDishImage } from '@/utils/dishImages'

interface Dish {
  id: string; categoryId: string; name: string; price: number
  desc: string; image?: string; tags?: string[]; portionSize?: number
}

interface Category { id: string; name: string; sort: number }

interface MenuData {
  merchant: { id: string; name: string }
  branch: { id: string; name: string; todayLocation: string; businessHours: string }
  categories: Category[]
  dishes: Dish[]
}

const menu = ref<MenuData | null>(null)
const qrDataUrl = ref('')

const sortedCategories = computed(() => {
  if (!menu.value) return []
  return [...menu.value.categories].sort((a, b) => a.sort - b.sort)
})

function dishesByCat(catId: string) {
  return menu.value?.dishes.filter(d => d.categoryId === catId) || []
}

function featuredDish(cat: Category) {
  return dishesByCat(cat.id).find(d => d.tags?.includes('招牌') || d.tags?.includes('推荐')) || null
}

function normalDishes(cat: Category) {
  const f = featuredDish(cat)
  return dishesByCat(cat.id).filter(d => f ? d.id !== f.id : true)
}

function dishImage(d: Dish) {
  return d.image || getDishImage(d.id) || ''
}

function onImgError(e: Event) {
  (e.target as HTMLElement).style.display = 'none'
}

const barColors = ['#ff6b00', '#4aad4e', '#a04100', '#e2bfb0', '#8e7164', '#5e5e5c']
function catBarColor(catName: string) {
  let hash = 0
  for (let i = 0; i < catName.length; i++) hash = ((hash << 5) - hash) + catName.charCodeAt(i)
  return barColors[Math.abs(hash) % barColors.length]
}

onMounted(async () => {
  try {
    const res = await fetch('/api/catalog/menu')
    const data = await res.json()
    menu.value = data

    const shareUrl = `${location.origin}${location.pathname}${location.search}`
    qrDataUrl.value = await QRCode.toDataURL(shareUrl, { width: 160, margin: 2 })
  } catch (err) {
    console.error('share menu error:', err)
  }
})
</script>

<style scoped>
.share-page { background: #fcf9f8; color: #1c1b1b; min-height: 100vh; padding-bottom: 32px; font-family: Inter, sans-serif; }
.loading-state { display: flex; align-items: center; justify-content: center; }
.share-header { padding: 32px 16px 20px; text-align: center; }
.share-logo { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.share-header h1 { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 800; color: #a04100; text-transform: uppercase; letter-spacing: -0.02em; margin: 0; }
.share-hero { text-align: center; padding: 0 16px 24px; }
.share-hero .badge { display: inline-block; padding: 4px 16px; background: #ffdbcc; border-radius: 999px; margin-bottom: 16px; }
.share-hero .badge span { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 600; color: #7a3000; text-transform: uppercase; letter-spacing: 0.1em; }
.share-hero .badge .badge-en { font-size: 10px; font-weight: 400; opacity: 0.7; }
.share-hero h2 { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 28px; font-weight: 800; color: #1c1b1b; margin: 0 0 2px; line-height: 1.2; }
.share-hero .hero-sub-en { width: 100%; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 600; color: #8e7164; margin: 0 auto 12px; letter-spacing: 0.02em; text-transform: uppercase; text-align: center; }
.share-hero p { font-family: Inter, sans-serif; font-size: 16px; color: #5e5e5c; line-height: 1.5; max-width: 360px; margin: 0 auto; }
.promo-img-wrap { position: relative; margin: 0 16px 24px; border-radius: 16px; overflow: hidden; height: 192px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
.promo-img { object-fit: cover; display: block; }
.promo-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.6), transparent); display: flex; flex-direction: column; justify-content: flex-end; padding: 16px; }
.promo-badge { display: inline-block; align-self: flex-start; background: #ff6b00; color: #fff; font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 4px; margin-bottom: 4px; }
.promo-overlay h3 { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 700; color: #fff; }
.share-container { max-width: 600px; margin: 0 auto; padding: 0 16px; }
.cat-section { margin-bottom: 24px; }
.cat-section h3 { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 700; color: #1c1b1b; margin: 0 0 16px; display: flex; align-items: center; gap: 10px; }
.cat-bar { width: 4px; height: 20px; border-radius: 2px; flex-shrink: 0; }
.featured-card { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 12px; display: flex; gap: 12px; margin-bottom: 8px; }
.featured-img { width: 72px; height: 72px; border-radius: 10px; overflow: hidden; flex-shrink: 0; background: #f0eded; }
.featured-img img { width: 100%; height: 100%; object-fit: cover; }
.featured-body { flex: 1; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; }
.featured-header { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.featured-header h4 { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 700; color: #1c1b1b; }
.featured-body p { margin: 2px 0 0; font-family: Inter, sans-serif; font-size: 12px; color: #5e5e5c; line-height: 1.3; flex: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.featured-bottom { margin-top: 4px; }
.featured-price { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 800; color: #ff6b00; }
.featured-price .c-sign, .grid-price .c-sign { font-size: 0.7em; font-weight: 700; }
.grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.grid-card { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding:8px 12px; }
.grid-card-top { display: flex; gap: 10px; }
.grid-card-img { width: 64px; height: 64px; border-radius: 10px; overflow: hidden; background: #f0eded; flex-shrink: 0; }
.grid-card-img img { width: 100%; height: 100%; object-fit: cover; }
.grid-card-right { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; min-width: 0; }
.grid-price { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 800; color: #ff6b00; line-height: 1.2; }
.grid-price .c-sign { font-size: 0.7em; font-weight: 700; }
.grid-card-right h4 { margin: 2px 0 0; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 600; color: #1c1b1b; line-height: 1.3; }
.grid-portion { margin: 2px 0 0; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 600; color: #5e5e5c; }
.grid-card h4 { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 600; color: #1c1b1b; line-height: 1.3; }
.grid-portion { margin: 2px 0 0; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 600; color: #5e5e5c; }
.dish-h-portion { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 600; color: #5e5e5c; }
.dish-tag { padding: 2px 8px; border-radius: 999px; background: rgba(255, 107, 0, 0.1); color: #ff6b00; font-size: 12px; font-weight: 600; }
.footer-section { background: #313030; border-radius: 16px; padding: 32px 24px; text-align: center; margin: 24px 16px 0; position: relative; overflow: hidden; }
.footer-section .glow { position: absolute; top: -48px; right: -48px; width: 128px; height: 128px; background: rgba(255, 107, 0, 0.2); border-radius: 50%; filter: blur(64px); }
.footer-content { position: relative; z-index: 1; }
.footer-content h4 { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 700; color: #fff; margin: 0 0 8px; }
.footer-content p { font-family: Inter, sans-serif; font-size: 14px; color: #e5e2e1; margin: 0 0 24px; }
.qr-box { background: #fff; padding: 16px; border-radius: 16px; display: inline-block; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); margin-bottom: 24px; }
.qr-box img { display: block; width: 128px; height: 128px; }
.qr-placeholder { width: 128px; height: 128px; background: #f0eded; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #8e7164; font-size: 12px; }
.scan-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 24px; font-weight: 800; color: #ffb693; text-transform: uppercase; margin: 0 0 16px; letter-spacing: -0.02em; }
.footer-info { display: flex; justify-content: center; gap: 16px; }
.footer-info span { display: flex; align-items: center; gap: 4px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 600; color: #e5e2e1; }
</style>
