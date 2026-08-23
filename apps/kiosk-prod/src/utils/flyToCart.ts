export function flyToCart(startEl: HTMLElement) {
  const cartBar = document.querySelector('.cart-bar') as HTMLElement | null
  if (!cartBar || !startEl) return

  const start = startEl.getBoundingClientRect()
  const end = cartBar.getBoundingClientRect()

  const sx = start.left + start.width / 2
  const sy = start.top + start.height / 2
  const ex = end.left + end.width / 2
  const ey = end.top + end.height / 2

  const dot = document.createElement('div')
  const size = 36
  Object.assign(dot.style, {
    position: 'fixed',
    left: `${sx - size / 2}px`,
    top: `${sy - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    background: 'var(--primary-container, #ff6d00)',
    boxShadow: '0 4px 12px rgba(255,107,0,0.5)',
    zIndex: '9999',
    pointerEvents: 'none',
  })
  document.body.appendChild(dot)

  const duration = 700
  const peak = -80
  const startTime = performance.now()

  function animate(now: number) {
    const t = Math.min((now - startTime) / duration, 1)
    const ease = 1 - Math.pow(1 - t, 3)
    const arc = 4 * peak * t * (1 - t)

    dot.style.left = `${sx + (ex - sx) * ease - size / 2}px`
    dot.style.top = `${sy + (ey - sy) * ease + arc - size / 2}px`
    dot.style.transform = `scale(${1 - t * 0.6})`
    dot.style.opacity = `${1 - t * 0.5}`

    if (t < 1) {
      requestAnimationFrame(animate)
    } else {
      dot.remove()
      cartBar.style.transition = 'transform 0.15s ease'
      cartBar.style.transform = 'translateX(-50%) scale(1.08)'
      setTimeout(() => { cartBar.style.transform = 'translateX(-50%) scale(1)' }, 150)
    }
  }
  requestAnimationFrame(animate)
}
