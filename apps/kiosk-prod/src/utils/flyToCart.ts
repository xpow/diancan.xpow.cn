export function flyToCart(startEl: HTMLElement) {
  const cartBar = document.querySelector('.cart-bar') as HTMLElement | null
  if (!cartBar || !startEl) return

  const start = startEl.getBoundingClientRect()
  const end = cartBar.getBoundingClientRect()

  const dot = document.createElement('div')
  Object.assign(dot.style, {
    position: 'fixed',
    left: `${start.left + start.width / 2}px`,
    top: `${start.top + start.height / 2}px`,
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: 'var(--primary-container, #ff6d00)',
    boxShadow: '0 4px 12px rgba(255,107,0,0.5)',
    zIndex: '9999',
    pointerEvents: 'none',
    transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
    transform: 'scale(1)',
    opacity: '1',
  })
  document.body.appendChild(dot)

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      Object.assign(dot.style, {
        left: `${end.left + end.width / 2 - 8}px`,
        top: `${end.top + end.height / 2 - 8}px`,
        transform: 'scale(0.2)',
        opacity: '0.4',
      })
    })
  })

  setTimeout(() => {
    dot.remove()
    cartBar.style.transition = 'transform 0.15s ease'
    cartBar.style.transform = 'translateX(-50%) scale(1.08)'
    setTimeout(() => {
      cartBar.style.transform = 'translateX(-50%) scale(1)'
    }, 150)
  }, 500)
}
