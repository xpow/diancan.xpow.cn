<template>
  <div class="review-page">
    <KioskTopBar :title="merchantName" :deviceCode="deviceCode" :statusText="statusText" :businessHours="businessHours" :branchStatus="branchStatus" showHomeLink />
    <main class="review-content">
      <!-- Step 0: 开始页 -->
      <div v-if="step === 0" class="step-start hero">
        <span class="hero-icon material-icons">rate_review</span>
        <h1>告诉我们你的用餐体验</h1>
        <p class="hero-desc">完成问卷即可免费获得一道菜品<br>下次到店出示兑换码即可享用</p>
        <button class="btn-primary btn-start" @click="startReview">开始评价</button>
      </div>

      <!-- Step 1: 选择菜品 -->
      <div v-if="step === 1" class="step-select">
        <div class="step-header">
          <span class="step-title">选择你吃过的菜品</span>
          <span class="step-count">{{ selectedDishIds.size }}/{{ dishes.length }}</span>
        </div>
        <div v-if="dishes.length === 0" class="empty-state">
          <span class="material-icons empty-icon">restaurant_menu</span>
          <p>还没有点餐记录，先去点些菜品吧</p>
          <button class="btn-primary" @click="$router.push('/menu')">去点餐</button>
        </div>
        <div v-else class="dish-grid">
          <div v-for="d in dishes" :key="d.dishId" :class="['dish-chip', selectedDishIds.has(d.dishId) && 'dish-chip-active', reviewedDishIds.has(d.dishId) && 'dish-chip-reviewed']" @click="toggleDish(d)">
            <div class="dish-chip-img" :style="{ backgroundImage: d.image ? 'url(' + d.image + ')' : 'url(' + getDishImage(d.dishId) + ')' }"></div>
            <span class="dish-chip-name">{{ d.name }}</span>
            <span v-if="reviewedDishIds.has(d.dishId)" class="dish-chip-check material-icons">check</span>
          </div>
        </div>
      </div>

      <!-- Step 2: 逐菜评价 -->
      <div v-if="step === 2" class="step-rate">
        <div class="step-header">
          <button class="btn-back" @click="step = 1"><span class="material-icons">arrow_back</span></button>
          <span class="step-title">评价菜品</span>
          <span class="step-count">{{ rateIndex + 1 }}/{{ rateItems.length }}</span>
        </div>
        <div class="rate-card-wrap">
          <div class="rate-card" v-for="(item, idx) in rateItems" :key="item.dishId" v-show="idx === rateIndex">
            <h2 class="rate-dish-name">{{ item.dishName }}</h2>
            <div class="rate-section">
              <p class="rate-label">整体评价</p>
              <div class="overall-group">
                <button :class="['overall-btn', item.overall === 'good' && 'overall-good']" @click="item.overall = 'good'">😋 好吃</button>
                <button :class="['overall-btn', item.overall === 'okay' && 'overall-okay']" @click="item.overall = 'okay'">🤔 还行</button>
                <button :class="['overall-btn', item.overall === 'bad' && 'overall-bad']" @click="item.overall = 'bad'">😞 不好</button>
              </div>
            </div>
            <template v-if="item.overall && item.overall !== 'good'">
              <div class="rate-section">
                <p class="rate-label">辣度</p>
                <div class="taste-group">
                  <button :class="['taste-btn', item.spiciness === 1 && 'taste-active']" @click="item.spiciness = 1">不够辣</button>
                  <button :class="['taste-btn', item.spiciness === 2 && 'taste-active']" @click="item.spiciness = 2">刚好</button>
                  <button :class="['taste-btn', item.spiciness === 3 && 'taste-active']" @click="item.spiciness = 3">太辣</button>
                </div>
              </div>
              <div class="rate-section">
                <p class="rate-label">咸味</p>
                <div class="taste-group">
                  <button :class="['taste-btn', item.saltiness === 1 && 'taste-active']" @click="item.saltiness = 1">太淡</button>
                  <button :class="['taste-btn', item.saltiness === 2 && 'taste-active']" @click="item.saltiness = 2">刚好</button>
                  <button :class="['taste-btn', item.saltiness === 3 && 'taste-active']" @click="item.saltiness = 3">太咸</button>
                </div>
              </div>
              <div class="rate-section">
                <p class="rate-label">口感</p>
                <div class="taste-group">
                  <button :class="['taste-btn', item.texture === 1 && 'taste-active']" @click="item.texture = 1">太软</button>
                  <button :class="['taste-btn', item.texture === 2 && 'taste-active']" @click="item.texture = 2">刚好</button>
                  <button :class="['taste-btn', item.texture === 3 && 'taste-active']" @click="item.texture = 3">太硬</button>
                </div>
              </div>
              <div class="rate-section">
                <p class="rate-label">份量</p>
                <div class="taste-group">
                  <button :class="['taste-btn', item.portion === 1 && 'taste-active']" @click="item.portion = 1">太少</button>
                  <button :class="['taste-btn', item.portion === 2 && 'taste-active']" @click="item.portion = 2">刚好</button>
                  <button :class="['taste-btn', item.portion === 3 && 'taste-active']" @click="item.portion = 3">太多</button>
                </div>
              </div>
            </template>
            <div class="rate-section">
              <p class="rate-label">还想说什么？（选填）</p>
              <textarea v-model="item.comment" class="rate-comment" placeholder="说说你的感受..." maxlength="200" rows="2"></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: 选赠品 -->
      <div v-if="step === 3" class="step-gift hero">
        <span class="hero-icon material-icons">card_giftcard</span>
        <h1>感谢你的评价！</h1>
        <p class="hero-desc">选一道你喜欢的菜作为赠品<br>下次到店出示兑换码即可享用</p>
        <div class="gift-grid">
          <div v-for="d in giftDishes" :key="d.id" :class="['gift-card', selectedGiftId === d.id && 'gift-card-active']" @click="selectedGiftId = d.id">
            <div class="gift-img" :style="{ backgroundImage: d.image ? 'url(' + d.image + ')' : undefined }">
              <span v-if="!d.image" class="material-icons">restaurant</span>
            </div>
            <span class="gift-name">{{ d.name }}</span>
            <span class="gift-price">¥{{ d.price.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- Step 4: 完成 -->
      <div v-if="step === 4" class="step-code hero">
        <span class="hero-icon material-icons code-icon">rate_review</span>
        <h1>感谢你的评价！</h1>
        <p class="hero-desc">已收到你的反馈，我们会不断改进</p>

        <div class="review-summary">
          <div v-for="item in submittedItems" :key="item.dishName" class="summary-card">
            <div class="summary-dish">{{ item.dishName }}</div>
            <div class="summary-ratings">
              <span :class="['summary-badge', 'badge-' + item.overall]">
                {{ item.overall === 'good' ? '好吃' : item.overall === 'okay' ? '还行' : '不好' }}
              </span>
              <template v-if="item.overall !== 'good'">
                <span v-if="item.spiciness" class="summary-tag">辣度{{ ['','不够辣','刚好','太辣'][item.spiciness] }}</span>
                <span v-if="item.saltiness" class="summary-tag">咸味{{ ['','太淡','刚好','太咸'][item.saltiness] }}</span>
                <span v-if="item.texture" class="summary-tag">口感{{ ['','太软','刚好','太硬'][item.texture] }}</span>
                <span v-if="item.portion" class="summary-tag">份量{{ ['','太少','刚好','太多'][item.portion] }}</span>
              </template>
            </div>
            <div v-if="item.comment" class="summary-comment">"{{ item.comment }}"</div>
          </div>
        </div>

      <div v-if="rewardCode" class="gift-section">
          <p class="gift-label">赠品兑换码</p>
          <div class="code-box">
            <span class="code-value">{{ rewardCode }}</span>
          </div>
        </div>
      </div>
    </main>

    <!-- 历史评价弹窗 -->
    <Teleport to="body">
      <div v-if="showHistory" class="overlay" @click.self="showHistory = false">
        <div class="history-dialog">
          <div class="history-header">
            <span class="step-title">历史评价</span>
            <button class="btn-close" @click="showHistory = false"><span class="material-icons">close</span></button>
          </div>
          <div class="history-body">
            <div v-for="review in historyItems" :key="review.id" class="history-group">
              <div class="history-date">{{ review.createdAt.slice(0, 10) }}</div>
              <div v-for="item in review.items" :key="item.dishName" class="history-card">
                <div class="history-dish">{{ item.dishName }}</div>
                <div class="summary-ratings">
                  <span :class="['summary-badge', 'badge-' + item.overall]">
                    {{ item.overall === 'good' ? '好吃' : item.overall === 'okay' ? '还行' : '不好' }}
                  </span>
                  <template v-if="item.overall !== 'good'">
                    <span v-if="item.spiciness" class="summary-tag">辣度{{ ['','不够辣','刚好','太辣'][item.spiciness] }}</span>
                    <span v-if="item.saltiness" class="summary-tag">咸味{{ ['','太淡','刚好','太咸'][item.saltiness] }}</span>
                    <span v-if="item.texture" class="summary-tag">口感{{ ['','太软','刚好','太硬'][item.texture] }}</span>
                    <span v-if="item.portion" class="summary-tag">份量{{ ['','太少','刚好','太多'][item.portion] }}</span>
                  </template>
                </div>
                <div v-if="item.comment" class="summary-comment">"{{ item.comment }}"</div>
              </div>
              <div v-if="review.code" class="history-code">赠品：{{ review.code.dishName }}（{{ review.code.code }}）</div>
            </div>
            <div v-if="historyItems.length === 0" class="empty-state">
              <span class="material-icons empty-icon">rate_review</span>
              <p>暂无评价记录</p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Bottom actions (inside main scroll area, pinned to bottom of content) -->
    <div v-if="step === 1" class="bottom-actions">
      <button class="btn-secondary" @click="showHistory = true" :disabled="historyItems.length === 0">查看评价</button>
      <button :class="['btn-primary', selectedDishIds.size === 0 && 'btn-disabled']" :disabled="selectedDishIds.size === 0" @click="goToRate">下一步</button>
    </div>
    <div v-if="step === 2" class="bottom-actions">
      <button class="btn-secondary" @click="prevRate" :disabled="rateIndex === 0">上一道</button>
      <button v-if="rateIndex < rateItems.length - 1" class="btn-primary" @click="nextRate">下一道</button>
      <button v-else class="btn-primary" @click="submitReview">提交评价</button>
    </div>
    <div v-if="step === 3" class="bottom-actions">
      <button :class="['btn-primary', !selectedGiftId && 'btn-disabled']" :disabled="!selectedGiftId" @click="claimReward">选好了</button>
    </div>
    <div v-if="step === 4" class="bottom-actions">
      <button class="btn-primary" @click="$router.push('/home')">返回首页</button>
    </div>

    <BottomNav current="reviews" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiGet, apiPost } from '@/utils/api'
import KioskTopBar from '@/components/KioskTopBar.vue'
import BottomNav from '@/components/BottomNav.vue'
import { getDishImage } from '@/utils/dishImages'

interface DishItem { dishId: string; name: string; image: string | null; count: number }
interface RateItem { dishId: string; dishName: string; overall: string; spiciness: number | null; saltiness: number | null; texture: number | null; portion: number | null; comment: string }
interface GiftDish { id: string; name: string; price: number; image: string | null }

const step = ref(0)
const dishes = ref<DishItem[]>([])
const selectedDishIds = ref(new Set<string>())
const reviewedDishIds = ref(new Set<string>())
const rateItems = ref<RateItem[]>([])
const rateIndex = ref(0)
const giftDishes = ref<GiftDish[]>([])
const selectedGiftId = ref('')
const rewardCode = ref('')
const rewardDishName = ref('')
const currentReviewId = ref('')
const submittedItems = ref<{ dishName: string; overall: string; spiciness: number | null; saltiness: number | null; texture: number | null; portion: number | null; comment: string }[]>([])
const showHistory = ref(false)
const historyItems = ref<{ id: string; createdAt: string; items: { dishName: string; overall: string; spiciness: number | null; saltiness: number | null; texture: number | null; portion: number | null; comment: string }[]; code: { code: string; dishName: string } | null }[]>([])

// TopBar data
const merchantName = ref('')
const deviceCode = ref('')
const statusText = ref('')
const businessHours = ref('')
const branchStatus = ref('')

onMounted(async () => {
  try {
    const boot = await apiGet<any>('/api/system/bootstrap?sn=' + localStorage.getItem('kiosk-device-sn'))
    merchantName.value = boot.merchantName || ''
    deviceCode.value = boot.deviceCode || ''
    statusText.value = boot.statusText || ''
    businessHours.value = boot.businessHours || ''
    branchStatus.value = boot.branchStatus || ''
  } catch {}
  try {
    const status = await apiGet<{ reviewed: boolean; reviewedDishIds: string[]; current: any }>('/api/reviews/status')
    reviewedDishIds.value = new Set(status.reviewedDishIds)
    if (status.current?.code) {
      rewardCode.value = status.current.code.code
      rewardDishName.value = status.current.code.dishName
      step.value = 4
      return
    }
    if (status.current) currentReviewId.value = status.current.id
  } catch {}
  try {
    const h = await apiGet<{ items: any[] }>('/api/reviews/history')
    historyItems.value = h.items
  } catch {}
  const data = await apiGet<{ items: DishItem[] }>('/api/reviews/dishes')
  dishes.value = data.items
  if (dishes.value.length === 0) {
    if (reviewedDishIds.value.size > 0) {
      step.value = 4
    }
    return
  }
  const newDishes = dishes.value.filter((d) => !reviewedDishIds.value.has(d.dishId))
  if (newDishes.length === 0) {
    if (historyItems.value.length) submittedItems.value = historyItems.value.flatMap((r) => r.items).filter((item, idx, arr) => arr.findIndex((i) => i.dishName === item.dishName) === idx)
    step.value = 4; return
  }
  step.value = 1
})

async function startReview() {
  const status = await apiGet<{ reviewed: boolean; reviewedDishIds: string[]; current: any }>('/api/reviews/status')
  reviewedDishIds.value = new Set(status.reviewedDishIds)
  if (status.current?.code) {
    rewardCode.value = status.current.code.code
    rewardDishName.value = status.current.code.dishName
    step.value = 4; return
  }
  if (status.current) currentReviewId.value = status.current.id
  if (!dishes.value.length) {
    const data = await apiGet<{ items: DishItem[] }>('/api/reviews/dishes')
    dishes.value = data.items
  }
  if (dishes.value.length === 0) return
  const newDishes = dishes.value.filter((d) => !reviewedDishIds.value.has(d.dishId))
  if (newDishes.length === 0) {
    try {
      const h = await apiGet<{ items: any[] }>('/api/reviews/history')
      if (h.items.length) submittedItems.value = h.items.flatMap((r: any) => r.items).filter((item: any, idx: number, arr: any[]) => arr.findIndex((i: any) => i.dishName === item.dishName) === idx)
    } catch {}
    step.value = 4; return
  }
  step.value = 1
}

function toggleDish(d: DishItem) {
  if (reviewedDishIds.value.has(d.dishId)) return
  const s = new Set(selectedDishIds.value)
  if (s.has(d.dishId)) s.delete(d.dishId)
  else s.add(d.dishId)
  selectedDishIds.value = s
}

function goToRate() {
  rateItems.value = dishes.value.filter((d) => selectedDishIds.value.has(d.dishId)).map((d) => ({
    dishId: d.dishId,
    dishName: d.name,
    overall: '',
    spiciness: null,
    saltiness: null,
    texture: null,
    portion: null,
    comment: '',
  }))
  rateIndex.value = 0
  step.value = 2
}

function nextRate() {
  if (rateIndex.value < rateItems.value.length - 1) rateIndex.value++
}

function prevRate() {
  if (rateIndex.value > 0) rateIndex.value--
}

async function submitReview() {
  const invalid = rateItems.value.find((i) => !i.overall)
  if (invalid) { alert('请给每道菜选择整体评价'); return }
  submittedItems.value = rateItems.value.map((i) => ({ dishName: i.dishName, overall: i.overall, spiciness: i.spiciness, saltiness: i.saltiness, texture: i.texture, portion: i.portion, comment: i.comment }))
  try {
    const boot = await apiGet<any>('/api/system/bootstrap?sn=' + localStorage.getItem('kiosk-device-sn'))
    const branchId = boot.branchId || ''
    const res = await apiPost<{ id: string }>('/api/reviews', {
      branchId,
      items: rateItems.value.map((i) => ({
        dishId: i.dishId,
        dishName: i.dishName,
        overall: i.overall,
        spiciness: i.spiciness,
        saltiness: i.saltiness,
        texture: i.texture,
        portion: i.portion,
        comment: i.comment || null,
      })),
      comment: '',
    })
    currentReviewId.value = res.id
    const gift = await apiGet<{ items: GiftDish[] }>('/api/reviews/gift-dishes')
    giftDishes.value = gift.items
    if (giftDishes.value.length === 0) {
      rewardCode.value = ''; rewardDishName.value = ''; step.value = 4
    } else {
      step.value = 3
    }
  } catch (e: any) {
    alert(e.message || '提交失败')
  }
}

async function claimReward() {
  if (!selectedGiftId.value || !currentReviewId.value) return
  const dish = giftDishes.value.find((d) => d.id === selectedGiftId.value)
  if (!dish) return
  try {
    const res = await apiPost<{ code: string; dishName: string }>('/api/reviews/reward', { reviewId: currentReviewId.value, dishId: dish.id, dishName: dish.name })
    rewardCode.value = res.code
    rewardDishName.value = res.dishName
    step.value = 4
  } catch (e: any) {
    alert(e.message || '领取失败')
  }
}
</script>

<style scoped>
.review-page { min-height: 100dvh; background: var(--page-bg); display: flex; flex-direction: column; overflow: hidden; }
.review-content { flex: 1; padding: 52px 0 130px; display: flex; flex-direction: column; overflow-y: auto; }
.review-content > * { flex: 1; }
.hero { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 24px; gap: 12px; }
.hero h1 { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--on-surface); margin: 0; }
.hero-desc { font-size: 14px; color: var(--secondary); line-height: 1.6; margin: 0; }
.btn-start { padding: 14px 40px; border-radius: var(--radius-full); font-size: 16px; font-weight: 700; margin-top: 12px; }

.step-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; }
.btn-back { background: none; border: none; padding: 4px; color: var(--on-surface); cursor: pointer; }
.step-title { flex: 1; font-family: var(--font-display); font-size: 18px; font-weight: 700; }
.step-count { font-size: 14px; color: var(--secondary); }

/* Step 1 */
.step-select { display: flex; flex-direction: column; }
.dish-grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 16px; flex: 1; align-content: flex-start; }
.dish-chip { position: relative; display: flex; align-items: center; gap: 10px; padding: 8px 16px 8px 8px; border-radius: var(--radius-full); background: var(--surface); border: 2px solid var(--outline-variant); cursor: pointer; transition: all 0.15s; box-shadow: var(--shadow-sm); }
.dish-chip:active { transform: scale(0.96); }
.dish-chip-active { border-color: var(--primary-container); background: color-mix(in srgb, var(--primary-container) 15%, var(--surface)); }
.dish-chip-reviewed { opacity: 0.45; cursor: default; pointer-events: none; }
.dish-chip-img { width: 36px; height: 36px; border-radius: 50%; background: var(--surface-container-high); background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.dish-chip-img .material-icons { font-size: 18px !important; color: var(--secondary); }
.dish-chip-name { font-family: var(--font-display); font-size: 14px; font-weight: 600; }
.dish-chip-check { position: absolute; top: -4px; right: -4px; width: 20px; height: 20px; border-radius: 50%; background: #22c55e; color: #fff; font-size: 14px !important; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.25); }

/* Bottom actions */
.bottom-actions { position: fixed; bottom: 64px; left: 0; right: 0; display: flex; gap: 12px; padding: 12px 16px; background: var(--surface); border-top: 1px solid var(--outline-variant); z-index: 40; }
.bottom-actions .btn-primary, .bottom-actions .btn-secondary { flex: 1; padding: 14px; border-radius: var(--radius-full); font-size: 16px; font-weight: 700; text-align: center; }
.btn-disabled { opacity: 0.4; pointer-events: none; }

/* Step 2 */
.step-rate { display: flex; flex-direction: column; }
.rate-card-wrap { flex: 1; padding: 0 16px; overflow-y: auto; }
.rate-card { padding: 16px 0; }
.rate-dish-name { font-family: var(--font-display); font-size: 24px; font-weight: 800; margin: 0 0 20px; text-align: center; }
.rate-section { margin-bottom: 16px; }
.rate-label { font-size: 14px; font-weight: 600; margin: 0 0 8px; color: var(--secondary); }
.overall-group, .taste-group { display: flex; gap: 8px; }
.overall-btn, .taste-btn { flex: 1; padding: 12px 8px; border-radius: var(--radius-lg); border: 2px solid var(--outline-variant); background: var(--surface); font-family: var(--font-display); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.overall-btn:active, .taste-btn:active { transform: scale(0.96); }
.overall-good { border-color: #22c55e; background: #f0fdf4; color: #15803d; }
.overall-okay { border-color: #f59e0b; background: #fffbeb; color: #92400e; }
.overall-bad { border-color: #ef4444; background: #fef2f2; color: #b91c1c; }
.taste-active { border-color: var(--primary-container); background: color-mix(in srgb, var(--primary-container) 20%, var(--surface)); }
.rate-comment { width: 100%; padding: 12px; border-radius: var(--radius-lg); border: 1px solid var(--outline-variant); background: var(--surface); font-family: var(--font-body); font-size: 14px; resize: none; outline: none; }
.rate-comment:focus { border-color: var(--primary-container); }

/* Step 3 */
.step-gift { overflow-y: auto; }
.gift-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px 0; width: 100%; }
.gift-card { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px; border-radius: var(--radius-xl); background: var(--surface); border: 2px solid transparent; cursor: pointer; transition: all 0.15s; box-shadow: var(--shadow-sm); }
.gift-card:active { transform: scale(0.96); }
.gift-card-active { border-color: var(--primary-container); }
.gift-img { width: 64px; height: 64px; border-radius: var(--radius-lg); background: var(--surface-container-high); background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; }
.gift-img .material-icons { font-size: 28px !important; color: var(--secondary); }
.gift-name { font-family: var(--font-display); font-size: 14px; font-weight: 600; text-align: center; }
.gift-price { font-size: 13px; color: var(--secondary); }

/* Step 4 */
.step-code { overflow-y: auto; }
.code-icon { color: var(--primary-container) !important; }
.code-box { background: var(--surface); border: 2px dashed var(--primary-container); border-radius: var(--radius-xl); padding: 20px 32px; margin: 8px 0; }
.code-value { font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: var(--primary-container); }
.code-dish { font-size: 15px; font-weight: 600; color: var(--secondary); margin: 8px 0 20px; }
.gift-label { font-size: 13px; color: var(--secondary); margin: 12px 0 4px; }
.review-summary { width: 100%; max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 8px 0; }
.summary-card { background: var(--surface); border-radius: var(--radius-lg); padding: 12px; border: 1px solid var(--outline-variant); text-align: left; }
.summary-dish { font-family: var(--font-display); font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.summary-ratings { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.summary-badge { display: inline-block; padding: 2px 10px; border-radius: var(--radius-full); font-size: 12px; font-weight: 700; }
.badge-good { background: #f0fdf4; color: #15803d; }
.badge-okay { background: #fffbeb; color: #92400e; }
.badge-bad { background: #fef2f2; color: #b91c1c; }
.summary-tag { display: inline-block; padding: 2px 8px; border-radius: var(--radius-full); background: var(--surface-container); font-size: 11px; color: var(--secondary); }
.summary-comment { font-size: 13px; color: var(--secondary); font-style: italic; margin-top: 6px; }
.step-code.hero { overflow-y: auto; justify-content: flex-start; }

/* History dialog */
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; }
.history-dialog { width: 100%; max-width: 400px; max-height: 80vh; background: var(--page-bg); border-radius: var(--radius-xl); display: flex; flex-direction: column; overflow: hidden; }
.history-header { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid var(--outline-variant); }
.btn-close { background: none; border: none; color: var(--secondary); cursor: pointer; padding: 4px; }
.history-body { flex: 1; overflow-y: auto; padding: 12px 16px; }
.history-group { margin-bottom: 16px; }
.history-date { font-size: 12px; font-weight: 600; color: var(--secondary); margin-bottom: 8px; }
.history-card { background: var(--surface); border-radius: var(--radius-lg); padding: 10px 12px; margin-bottom: 6px; border: 1px solid var(--outline-variant); }
.history-dish { font-family: var(--font-display); font-size: 14px; font-weight: 700; margin-bottom: 4px; }
.history-code { font-size: 12px; color: var(--primary-container); font-weight: 600; margin-top: 4px; }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 24px; text-align: center; color: var(--secondary); }
.empty-icon { font-size: 48px !important; opacity: 0.4; }

[data-theme="dark"] .overall-good { background: #052e16; color: #86efac; }
[data-theme="dark"] .overall-okay { background: #291b00; color: #fcd34d; }
[data-theme="dark"] .overall-bad { background: #2d0a0a; color: #fca5a5; }
[data-theme="dark"] .taste-active { background: color-mix(in srgb, var(--primary-container) 25%, transparent); }
[data-theme="dark"] .bottom-actions { border-color: #2a2827; }
[data-theme="dark"] .badge-good { background: #052e16; color: #86efac; }
[data-theme="dark"] .badge-okay { background: #291b00; color: #fcd34d; }
[data-theme="dark"] .badge-bad { background: #2d0a0a; color: #fca5a5; }
</style>