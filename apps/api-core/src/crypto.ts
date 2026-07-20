import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-cbc'
const KEY = Buffer.from(
  (process.env.DEVICE_ENCRYPT_KEY || 'diancan-xpow-dev-encrypt-key-32!').padEnd(32).slice(0, 32)
)
const IV_LENGTH = 16

export function encryptDeviceSN(sn: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(sn, 'utf8'), cipher.final()])
  return iv.toString('base64url') + '.' + encrypted.toString('base64url')
}

export function decryptDeviceToken(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null
    const iv = Buffer.from(parts[0], 'base64url')
    const encrypted = Buffer.from(parts[1], 'base64url')
    const decipher = createDecipheriv(ALGORITHM, KEY, iv)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8')
  } catch {
    return null
  }
}
