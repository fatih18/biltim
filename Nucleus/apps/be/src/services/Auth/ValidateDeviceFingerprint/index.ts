import type { DeviceInfo } from '../GenerateDeviceFingerprint'
import { GenerateDeviceFingerprint } from '../GenerateDeviceFingerprint'

export function ValidateDeviceFingerprint(
  storedFingerprint: string,
  currentDeviceInfo: DeviceInfo
): boolean {
  const currentFingerprint = GenerateDeviceFingerprint(currentDeviceInfo)
  return storedFingerprint === currentFingerprint
}
