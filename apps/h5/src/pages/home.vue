<template>
  <div class="home">
    <header class="top-bar">
      <div class="top-left">
        <span class="material-symbols-outlined top-icon">restaurant_menu</span>
        <h1 class="top-title">Sizzling Skewers</h1>
      </div>
      <div class="top-right">
        <span class="status-badge">
          <span class="status-dot"></span>
          营业中
        </span>
      </div>
    </header>

    <main>
      <div class="section pt-20">
        <div class="points-card">
          <div class="points-left">
            <div class="points-avatar">
              <img src="@/assets/images/avatar.jpeg?raw=true" alt="avatar" class="avatar-img" />
            </div>
            <div>
              <h4 class="points-name">都市烟火暖人心</h4>
              <span class="points-tag">Gold Member</span>
            </div>
          </div>
          <div class="points-right">
            <p class="points-label">当前积分</p>
            <p class="points-value">1280</p>
          </div>
        </div>
      </div>

      <section class="hero">
        <div class="hero-img">
          <img
            src="@/assets/images/hero.png?raw=true"
            alt="炭火烧烤"
            class="hero-img-el"
          />
          <div class="hero-gradient"></div>
        </div>
        <div class="hero-content">
          <h2 class="hero-title">炭火烧烤小摊</h2>
          <p class="hero-desc">地道炭火 · 鲜嫩多汁 · 现烤现卖</p>
          <div class="hero-actions">
            <router-link to="/menu" class="hero-cta primary">
              <span class="material-symbols-outlined">restaurant_menu</span>
              开始点餐
            </router-link>
            <router-link :to="activeOrders.length ? { path: '/pickup', state: { orders: activeOrders } } : '/pickup'" class="hero-cta secondary">
              <span class="material-symbols-outlined">receipt_long</span>
              我的取餐
              <span v-if="activeOrderCount" class="badge-dot">{{ activeOrderCount }}</span>
            </router-link>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <h3 class="section-title">优惠活动</h3>
        </div>
        <div class="promo-list">
          <div class="promo-card discount">
            <div class="promo-icon-wrap">
              <span class="material-symbols-outlined promo-icon">redeem</span>
            </div>
            <div class="promo-body">
              <p class="promo-headline">限时满减</p>
              <p class="promo-detail">满50减5 · 满100减12</p>
            </div>
          </div>
          <div class="promo-card deal">
            <div class="deal-img">
              <img
                src="@/assets/images/yrc.png?raw=true"
                alt="羊肉串特惠"
                class="deal-img-el"
              />
            </div>
            <div class="deal-body">
              <div class="deal-tag-row">
                <span class="material-symbols-outlined deal-star" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="deal-tag-label">劲爆特惠</span>
              </div>
              <p class="deal-headline">羊肉串 买5送1</p>
              <p class="deal-desc">鲜嫩多汁，现烤现卖</p>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <h3 class="section-title">今日招牌</h3>
          <span class="section-more">查看全部</span>
        </div>
        <div class="specials-list">
          <div class="special-card">
            <div class="special-img">
              <img
                src="@/assets/images/hlyrc.png?raw=true"
                alt="招牌红柳羊肉串"
                class="special-img-el"
              />
              <span class="special-badge badge-hot">人气爆款</span>
            </div>
            <div class="special-info">
              <div class="special-name-row">
                <h4 class="special-name">【招牌】红柳羊肉串(大)</h4>
                <span class="special-price">¥12/串</span>
              </div>
              <p class="special-desc">西北空运鲜羊肉，传统红柳枝炭火慢烤</p>
            </div>
          </div>
          <div class="special-card">
            <div class="special-img">
              <img
                src="@/assets/images/aelkc.png?raw=true"
                alt="秘制奥尔良鸡翅"
                class="special-img-el"
              />
              <span class="special-badge badge-new">新品上市</span>
            </div>
            <div class="special-info">
              <div class="special-name-row">
                <h4 class="special-name">【秘制】奥尔良鸡翅(大)</h4>
                <span class="special-price">¥8/串</span>
              </div>
              <p class="special-desc">独家配方腌制24小时，皮脆肉嫩</p>
            </div>
          </div>
        </div>
      </section>

      <section class="section info-grid">
        <div class="info-card">
          <span class="material-symbols-outlined info-icon">schedule</span>
          <p class="info-label">营业时间</p>
          <p class="info-value">17:00 - 02:00</p>
        </div>
        <div class="info-card" @click="doLocate" role="button" tabindex="0">
          <span class="material-symbols-outlined info-icon">location_on</span>
          <p class="info-label">当前位置</p>
          <p class="info-value">{{ locationText }}</p>
        </div>
      </section>

      <footer class="site-footer">
        <p>© 2024 Sizzling Skewers · 炭火烧烤小摊</p>
        <p class="footer-slogan">用心做好每一串，传递市井烟火气</p>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const locationText = ref('点击获取位置')
const activeOrders = ref<any[]>([])
const activeOrderCount = computed(() => activeOrders.value.length)

onMounted(() => {
  Promise.all([
    fetch('/api/orders?branchId=demo-branch&status=pending&limit=10').then(r => r.json()),
    fetch('/api/orders?branchId=demo-branch&status=preparing&limit=10').then(r => r.json()),
  ])
    .then(([pending, preparing]) => {
      activeOrders.value = [...pending, ...preparing].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    })
    .catch(() => {})
})

async function matchNearby(lat: number, lng: number) {
  try {
    const res = await fetch(`/api/night-markets/nearby/query?lat=${lat}&lng=${lng}`)
    const data = await res.json()
    if (data && data.name) {
      locationText.value = `📍 ${data.name}（距您约${data.dist}m）`
    } else {
      locationText.value = '暂未识别到夜市区域'
    }
  } catch {
    locationText.value = '定位匹配失败'
  }
}

function doLocate() {
  if (!navigator.geolocation) {
    locationText.value = '浏览器不支持定位'
    return
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => matchNearby(pos.coords.latitude, pos.coords.longitude),
    () => {
      locationText.value = '定位失败，请允许位置权限'
    },
    { enableHighAccuracy: true, timeout: 8000 },
  )
}

// 自动定位（onMounted 移除，改为用户点击触发）
</script>

<style scoped>
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: rgba(252, 249, 248, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.top-left { display: flex; align-items: center; gap: 8px; }
.top-icon { color: var(--primary-container); font-size: 24px; }
.top-title { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--primary-container); text-transform: uppercase; letter-spacing: -0.02em; margin: 0; }
.status-badge { display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: rgba(0, 110, 28, 0.1); border-radius: 8px; color: var(--tertiary); font-family: var(--font-display); font-size: 14px; font-weight: 600; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--tertiary); animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.section { padding: 12px 16px; }
.pt-20 { padding-top: 60px; }

.points-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--surface-container-low);
  border-radius: 12px;
  padding: 16px;
}
.points-left { display: flex; align-items: center; gap: 12px; }
.points-avatar { width: 48px; height: 48px; border-radius: 50%; overflow: hidden; border: 2px solid var(--primary-container); }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.points-name { font-family: var(--font-display); font-size: 18px; font-weight: 700; margin: 0; }
.points-tag { font-size: 12px; font-weight: 600; color: var(--primary); background: rgba(255, 107, 0, 0.12); padding: 2px 8px; border-radius: 9999px; letter-spacing: 0.02em; }
.points-right { text-align: right; }
.points-label { font-size: 12px; font-weight: 600; color: var(--secondary); margin: 0 0 2px; letter-spacing: 0.02em; }
.points-value { font-family: var(--font-display); font-size: 20px; font-weight: 800; color: var(--primary-container); margin: 0; }

.hero { position: relative; width: 100%; height: 530px; overflow: hidden; }
.hero-img { width: 100%; height: 100%; position: relative; background: linear-gradient(135deg, #1a1a1a 0%, #3d2b1f 40%, #6b3a1f 100%); }
.hero-img-el { width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0; }
.hero-gradient { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%); z-index: 1; }
.hero-content { position: absolute; bottom: 0; left: 0; right: 0; padding: 24px 16px; z-index: 2; }
.hero-title { font-family: var(--font-display); font-size: 32px; font-weight: 800; line-height: 40px; letter-spacing: -0.02em; color: #fff; margin: 0 0 4px; }
.hero-desc { font-size: 16px; line-height: 24px; color: rgba(255,255,255,0.8); margin: 0 0 24px; }
.hero-cta { display: flex; align-items: center; justify-content: center; gap: 8px; font-family: var(--font-display); font-size: 18px; font-weight: 700; line-height: 24px; padding: 16px; border-radius: 9999px; text-decoration: none; transition: transform 0.15s; flex: 1; }
.hero-cta:active { transform: scale(0.95); }
.hero-cta.primary { background: var(--primary-container); color: var(--on-primary); box-shadow: 0 8px 20px rgba(255,107,0,0.3); }
.hero-cta.secondary { background: rgba(255,255,255,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.3); backdrop-filter: blur(8px); }
.hero-actions { display: flex; gap: 12px; }
.badge-dot { position: absolute; top: -4px; right: -4px; background: var(--error); color: #fff; font-size: 10px; font-weight: 700; min-width: 18px; height: 18px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; padding: 0 4px; border: 2px solid rgba(0,0,0,0.2); }
.hero-cta.secondary { position: relative; }

.section-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; }
.section-title { font-family: var(--font-display); font-size: 24px; font-weight: 700; line-height: 32px; margin: 0; }
.section-more { font-family: var(--font-display); font-size: 14px; font-weight: 600; color: var(--primary-container); }

.promo-list { display: flex; flex-direction: column; gap: 16px; }
.promo-card { border-radius: 12px; overflow: hidden; }
.promo-card.discount { display: flex; align-items: center; gap: 16px; background: rgba(255, 107, 0, 0.06); border: 1px solid rgba(255, 107, 0, 0.2); padding: 24px; }
.promo-icon-wrap { padding: 12px; background: rgba(255, 107, 0, 0.12); border-radius: 50%; }
.promo-icon { font-size: 32px; color: var(--primary-container); }
.promo-body { flex: 1; }
.promo-headline { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--primary); margin: 0 0 4px; }
.promo-detail { font-size: 16px; line-height: 24px; color: var(--on-surface-variant); font-weight: 600; margin: 0; }
.promo-card.deal { display: flex; background: var(--surface-container-lowest); border: 1px solid var(--outline-variant); box-shadow: var(--shadow-card); }
.deal-img { width: 33.333%; height: 128px; overflow: hidden; }
.deal-img-el { width: 100%; height: 100%; object-fit: cover; }
.deal-body { width: 66.666%; padding: 16px; display: flex; flex-direction: column; justify-content: center; }
.deal-tag-row { display: flex; align-items: center; gap: 4px; margin-bottom: 4px; }
.deal-star { font-size: 14px; color: var(--tertiary); }
.deal-tag-label { font-size: 12px; font-weight: 600; color: var(--tertiary); text-transform: uppercase; letter-spacing: 0.04em; }
.deal-headline { font-family: var(--font-display); font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.deal-desc { font-size: 14px; line-height: 20px; color: var(--secondary); margin: 0; }

.specials-list { display: flex; flex-direction: column; gap: 16px; }
.special-card { background: var(--surface-container-lowest); border-radius: 12px; border: 1px solid var(--outline-variant); overflow: hidden; box-shadow: var(--shadow-card); }
.special-img { position: relative; height: 160px; overflow: hidden; background: linear-gradient(135deg, #6b3a1f, #8b4513); }
.special-img-el { width: 100%; height: 100%; object-fit: cover; }
.special-badge { position: absolute; top: 8px; left: 8px; padding: 4px 8px; border-radius: 8px; font-size: 12px; font-weight: 600; color: #fff; z-index: 1; }
.badge-hot { background: var(--error); }
.badge-new { background: var(--tertiary-container); color: var(--on-tertiary-container); }
.special-info { padding: 16px; }
.special-name-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
.special-name { font-family: var(--font-display); font-size: 18px; font-weight: 700; margin: 0; }
.special-price { font-family: var(--font-display); font-size: 20px; font-weight: 800; color: var(--primary-container); }
.special-desc { font-size: 14px; line-height: 20px; color: var(--secondary); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.info-card { background: var(--surface-container-low); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; gap: 8px; cursor: pointer; }
.info-card:active { background: var(--surface-container); }
.info-icon { font-size: 32px; color: var(--primary-container); }
.info-label { font-family: var(--font-display); font-size: 14px; font-weight: 600; color: var(--secondary); margin: 0; }
.info-value { font-family: var(--font-display); font-size: 18px; font-weight: 700; margin: 0; }

.site-footer { padding: 24px 16px; text-align: center; padding-bottom: 80px; }
.site-footer p { font-size: 12px; font-weight: 600; color: rgba(94, 94, 92, 0.6); margin: 0; letter-spacing: 0.02em; }
.footer-slogan { margin-top: 4px !important; color: rgba(94, 94, 92, 0.4) !important; }
</style>
