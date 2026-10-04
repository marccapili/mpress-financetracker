import type { IconProps } from '@phosphor-icons/react'
import { ArrowUUpLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowUUpLeft'
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise'
import { ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/csr/ArrowsLeftRight'
import { BackspaceIcon } from '@phosphor-icons/react/dist/csr/Backspace'
import { CalculatorIcon } from '@phosphor-icons/react/dist/csr/Calculator'
import { ChartPieSliceIcon } from '@phosphor-icons/react/dist/csr/ChartPieSlice'
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check'
import { ClockCounterClockwiseIcon } from '@phosphor-icons/react/dist/csr/ClockCounterClockwise'
import { CloudCheckIcon } from '@phosphor-icons/react/dist/csr/CloudCheck'
import { CloudSlashIcon } from '@phosphor-icons/react/dist/csr/CloudSlash'
import { DeviceMobileIcon } from '@phosphor-icons/react/dist/csr/DeviceMobile'
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/csr/DownloadSimple'
import { GearSixIcon } from '@phosphor-icons/react/dist/csr/GearSix'
import { MoonIcon } from '@phosphor-icons/react/dist/csr/Moon'
import { PercentIcon } from '@phosphor-icons/react/dist/csr/Percent'
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus'
import { SignOutIcon } from '@phosphor-icons/react/dist/csr/SignOut'
import { SunIcon } from '@phosphor-icons/react/dist/csr/Sun'
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash'
import { WarningIcon } from '@phosphor-icons/react/dist/csr/Warning'
import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight'

const ICONS = {
  undo: ArrowUUpLeftIcon,
  sync: ArrowsClockwiseIcon,
  swap: ArrowsLeftRightIcon,
  backspace: BackspaceIcon,
  calculator: CalculatorIcon,
  overview: ChartPieSliceIcon,
  check: CheckIcon,
  history: ClockCounterClockwiseIcon,
  cloud: CloudCheckIcon,
  offline: CloudSlashIcon,
  phone: DeviceMobileIcon,
  download: DownloadSimpleIcon,
  settings: GearSixIcon,
  moon: MoonIcon,
  percent: PercentIcon,
  plus: PlusIcon,
  signout: SignOutIcon,
  sun: SunIcon,
  trash: TrashIcon,
  warning: WarningIcon,
  close: XIcon,
  next: CaretRightIcon,
} as const

export type IconName = keyof typeof ICONS

export function Icon({ name, size = 20, weight = 'regular', className }: { name: IconName; size?: number; weight?: IconProps['weight']; className?: string }) {
  const C = ICONS[name]
  return <C size={size} weight={weight} className={className} aria-hidden />
}
