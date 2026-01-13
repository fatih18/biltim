import crypto from 'node:crypto'

export type DeviceInfo = {
  ip: string
  userAgent: string
}

export function GenerateDeviceFingerprint(deviceInfo: DeviceInfo): string {
  const { ip, userAgent } = deviceInfo
  const data = `${ip}:${userAgent}`

  return crypto.createHash('sha256').update(data).digest('hex')
}
