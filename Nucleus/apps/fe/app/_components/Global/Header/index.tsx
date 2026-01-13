import {
  BarChart3,
  Beaker,
  Building,
  Cpu,
  Home,

  Signature,
  Table,
  Users,
  InspectIcon,
  FileQuestionIcon
} from 'lucide-react'
import { ClientSide } from './ClientSide'
import type { HeaderNavCategory } from './types'

export function Header() {
  // Legacy flat nav items (kept for backwards compatibility)
  const nav = [{ id: 'dashboard', label: 'Dashboard', icon: <Home size={16} />, href: '/' }]

  // New categorized navigation
  const navCategories: HeaderNavCategory[] = [
    {
      id: 'dashboard',
      label: 'Ana Sayfa',
      icon: <Home size={16} />,
      href: '/',
    },
    {
      id: 'system',
      label: 'Sistem',
      icon: <Cpu size={16} />,
      items: [
        { id: 'logs', label: 'Logs', icon: <BarChart3 size={16} />, href: '/logs' },
        { id: 'users', label: 'Kullanıcılar', icon: <Users size={16} />, href: '/users' },
        {
          id: 'ana-veri-yonetimi',
          label: 'Ana Veri Yönetimi',
          icon: <Signature size={16} />,
          href: '/ana-veri-yonetimi',
        },

        {
          id: 'iyilestirici-faaliyetler',
          label: 'İyileştirici Faaliyetler',
          icon: <Table size={16} />,
          href: '/iyilestirici-faaliyetler',
        },
      ],
    },
    {
      id: 'Denetim',
      label: 'Denetim',
      icon: <InspectIcon size={16} />,
      href: '/denetim',
    },
    {
      id: 'bulgular',
      label: 'Bulgular',
      icon: <FileQuestionIcon size={16} />,
      href: '/bulgular',
    },
  ]

  if (process.env.IS_MULTI_TENANT === 'true') {
    // Add tenants to System category
    const systemCategory = navCategories.find((c) => c.id === 'system')
    if (systemCategory?.items) {
      systemCategory.items.push({
        id: 'tenants',
        label: 'Tenants',
        icon: <Building size={16} />,
        href: '/tenants',
      })
    }
  }

  return <ClientSide navItems={nav} navCategories={navCategories} />
}
