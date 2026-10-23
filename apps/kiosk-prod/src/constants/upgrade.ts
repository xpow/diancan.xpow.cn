/**
 * 旧版点餐（diancan）停用后的升级跳转。
 * 地址来自 3 号点餐机分享二维码，以后只改这里即可。
 */
export const LEGACY_UPGRADE_URL =
  'https://dd.xpow.cn/#/home?code=JgA5vS8dJ8mCaZgDt6eidQ.1O1dnPxfPWGgMUrLn4wAKA'

/** 打开旧版后，倒计时结束自动跳转的秒数 */
export const LEGACY_UPGRADE_COUNTDOWN_SECONDS = 10

export const LEGACY_UPGRADE_MESSAGE = '点餐项目已升级，旧版已不再使用。'

/** 整页跳转到新版。跨站到 dd，不走 vue-router。 */
export function redirectToLegacyUpgrade(): void {
  window.location.href = LEGACY_UPGRADE_URL
}
