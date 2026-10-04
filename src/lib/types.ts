export type Currency = 'USD' | 'PHP'
export type TxType = 'income' | 'expense'
export type Channel = 'PayPal' | 'Wise' | 'GCash' | 'Bank' | 'Other'
export type FeeMode = 'percent' | 'flat'

export const CHANNELS: Channel[] = ['PayPal', 'Wise', 'GCash', 'Bank', 'Other']
export const CURRENCIES: Currency[] = ['USD', 'PHP']

export interface Fee {
  mode: FeeMode
  value: number
}

export interface SplitLine {
  id: string
  label: string
  percent: number
  /** Amount in the transaction's own currency */
  amount: number
  status: 'pending' | 'allocated'
  allocatedAt?: string
  allocatedBy?: string
  destination?: string
}

export interface Transaction {
  id: string
  type: TxType
  date: string // YYYY-MM-DD
  createdAt: string
  createdBy: string
  currency: Currency
  /** PHP per 1 USD at the time of logging */
  rate: number
  gross: number
  fee: number
  net: number
  /** Client for income, category for expense */
  party: string
  channel?: Channel
  note?: string
  splits: SplitLine[]
}

export interface Rule {
  id: string
  label: string
  percent: number
}

export interface Settings {
  rules: Rule[]
  presets: { label: string; percent: number }[]
  channelFees: Record<Channel, Fee>
  displayCurrency: Currency
  theme: 'light' | 'dark'
  me: string
  members: string[]
}
