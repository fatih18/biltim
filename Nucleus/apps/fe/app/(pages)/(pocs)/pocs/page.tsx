'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ArrowUpRight, ChevronRight, KeyRound, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { generateDailyPassword } from '@/app/api/check-daily-pass/pass'

// ============================================================================
// Types
// ============================================================================

type PocStatus = 'preparation' | 'in-progress' | 'live'

type PocItem = {
  id: string
  title: string
  summary: string
  link: string
  status: PocStatus
  owner: string
  identifier: string
}

type PocCompany = {
  id: string
  name: string
  shortName: string
  items: PocItem[]
}

// ============================================================================
// Data
// ============================================================================

const STATUS_CONFIG: Record<PocStatus, { label: string; className: string }> = {
  preparation: {
    label: 'Hazırlık',
    className: 'text-slate-500 bg-slate-100',
  },
  'in-progress': {
    label: 'Aktif',
    className: 'text-slate-900 bg-slate-200',
  },
  live: {
    label: 'Canlı',
    className: 'text-white bg-slate-900',
  },
}

const companies: PocCompany[] = [
  {
    id: 'telekom',
    name: 'Telekom',
    shortName: 'TLK',
    items: [
      {
        id: 'telekom-1',
        title: 'Finansal Fizibilite Otomasyonu',
        summary: 'Mail tabanlı fizibilite verilerini AI ile analiz eden otomasyon sistemi.',
        link: '/pocs/telekom/1',
        status: 'in-progress',
        owner: 'AI Delivery',
        identifier: 'TLK-001',
      },
      {
        id: 'telekom-2',
        title: 'Fizibilite Alpha',
        summary: 'Gelişmiş ML modelleri ile yeni nesil analiz motoru.',
        link: '/pocs/telekom/2',
        status: 'preparation',
        owner: 'Network Analytics',
        identifier: 'TLK-002',
      },
    ],
  },
  {
    id: 'humanis',
    name: 'Humanis Healthcare',
    shortName: 'HMS',
    items: [
      {
        id: 'humanis-1',
        title: 'Healthcare AI Avatar',
        summary: 'Bilgi tabanı destekli gerçek zamanlı video avatar deneyimi.',
        link: '/pocs/humanis/avatar',
        status: 'in-progress',
        owner: 'Digital Care',
        identifier: 'HMS-001',
      },
    ],
  },
  {
    id: 'vorion',
    name: 'Vorion Portal',
    shortName: 'VRN',
    items: [
      {
        id: 'vorion-1',
        title: 'Vorion AI Platform',
        summary: 'Kapsamlı AI platform deneyimi ve bilgi tabanı yönetimi.',
        link: '/pocs/vorion',
        status: 'in-progress',
        owner: 'Pair',
        identifier: 'VRN-001',
      },
    ],
  },
]

// ============================================================================
// Components
// ============================================================================

function PocRow({ item, index }: { item: PocItem; index: number }) {
  const statusConfig = STATUS_CONFIG[item.status]
  const rowRef = useRef<HTMLAnchorElement>(null)

  useGSAP(() => {
    if (!rowRef.current) return

    const row = rowRef.current

    row.addEventListener('mouseenter', () => {
      gsap.to(row, {
        x: 8,
        duration: 0.3,
        ease: 'power2.out',
      })
      gsap.to(row.querySelector('.arrow-icon'), {
        x: 4,
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      })
    })

    row.addEventListener('mouseleave', () => {
      gsap.to(row, {
        x: 0,
        duration: 0.3,
        ease: 'power2.out',
      })
      gsap.to(row.querySelector('.arrow-icon'), {
        x: 0,
        opacity: 0.5,
        duration: 0.3,
        ease: 'power2.out',
      })
    })
  }, [])

  return (
    <Link
      ref={rowRef}
      href={item.link}
      className="group flex items-center justify-between py-5 px-6 -mx-6 rounded-xl transition-colors hover:bg-slate-50"
    >
      <div className="flex items-center gap-6 flex-1 min-w-0">
        {/* Number */}
        <span className="text-xs font-mono text-slate-300 w-8 shrink-0">
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Identifier */}
        <span className="text-xs font-mono text-slate-400 w-20 shrink-0">{item.identifier}</span>

        {/* Title & Summary */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-slate-900 truncate group-hover:text-slate-700">
            {item.title}
          </h3>
          <p className="text-sm text-slate-400 truncate mt-0.5">{item.summary}</p>
        </div>
      </div>

      <div className="flex items-center gap-6 shrink-0">
        {/* Owner */}
        <span className="text-xs text-slate-400 hidden sm:block">{item.owner}</span>

        {/* Status */}
        <span className={`text-xs font-medium px-2.5 py-1 rounded ${statusConfig.className}`}>
          {statusConfig.label}
        </span>

        {/* Arrow */}
        <ArrowUpRight className="arrow-icon h-4 w-4 text-slate-400 opacity-50" />
      </div>
    </Link>
  )
}

function CompanySection({ company, index }: { company: PocCompany; index: number }) {
  const sectionRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!sectionRef.current) return

    gsap.fromTo(
      sectionRef.current,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: index * 0.15,
        ease: 'power3.out',
      }
    )
  }, [])

  return (
    <div ref={sectionRef} className="opacity-0">
      {/* Company Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
            <span className="text-white text-xs font-bold tracking-wider">{company.shortName}</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{company.name}</h2>
            <p className="text-sm text-slate-400">{company.items.length} aktif proje</p>
          </div>
        </div>
      </div>

      {/* POC List */}
      <div className="border-t border-slate-100">
        {company.items.map((item, idx) => (
          <div key={item.id} className={idx > 0 ? 'border-t border-slate-100' : ''}>
            <PocRow item={item} index={idx} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function PocsPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const [dailyPassword, setDailyPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const totalPocs = companies.reduce((acc, company) => acc + company.items.length, 0)

  function handleCopyDailyPassword() {
    const todayPassword = dailyPassword ?? generateDailyPassword(new Date(), 16)
    setDailyPassword(todayPassword)

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(todayPassword)
        .then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
        .catch(() => {
          setCopied(false)
        })
    }
  }

  useGSAP(() => {
    // Hero animation
    const tl = gsap.timeline()

    tl.fromTo(
      '.hero-badge',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    )
      .fromTo(
        '.hero-title',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
        '-=0.3'
      )
      .fromTo(
        '.hero-subtitle',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
        '-=0.4'
      )
      .fromTo(
        '.stat-item',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out' },
        '-=0.2'
      )

    // Floating animation for stats
    gsap.to('.stat-number', {
      y: -2,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut',
      stagger: 0.2,
    })
  }, [])

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section ref={heroRef} className="pt-16 pb-20 border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          {/* Badge */}
          <div className="hero-badge flex items-center gap-2 text-sm text-slate-500 mb-8 opacity-0">
            <Zap className="h-4 w-4" />
            <span>Proof of Concept</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-900 font-medium">Portföy</span>
          </div>

          {/* Title */}
          <h1 className="hero-title text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-6 opacity-0">
            Kurumsal
            <br />
            <span className="text-slate-400">POC Çalışmaları</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle text-lg md:text-xl text-slate-500 max-w-xl leading-relaxed mb-16 opacity-0">
            İnovatif çözümlerimizin somut örnekleri. Her bir pilot proje, kurumsal ihtiyaçlara özel
            tasarlanmış yapay zeka uygulamalarını sergiler.
          </p>

          {/* Stats */}
          <div ref={statsRef} className="flex items-center gap-16">
            <div className="stat-item opacity-0">
              <div className="stat-number text-4xl md:text-5xl font-bold text-slate-900 tabular-nums">
                {companies.length}
              </div>
              <div className="text-sm text-slate-400 mt-1">Kurumsal Müşteri</div>
            </div>
            <div className="w-px h-12 bg-slate-200" />
            <div className="stat-item opacity-0">
              <div className="stat-number text-4xl md:text-5xl font-bold text-slate-900 tabular-nums">
                {totalPocs}
              </div>
              <div className="text-sm text-slate-400 mt-1">Aktif Proje</div>
            </div>
            <div className="w-px h-12 bg-slate-200" />
            <div className="stat-item opacity-0">
              <div className="stat-number text-4xl md:text-5xl font-bold text-slate-900 tabular-nums">
                100<span className="text-slate-300">%</span>
              </div>
              <div className="text-sm text-slate-400 mt-1">TypeScript</div>
            </div>
          </div>

          {/* Daily password helper */}
          <div className="mt-10 flex justify-end">
            <button
              type="button"
              onClick={handleCopyDailyPassword}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            >
              <KeyRound className="h-3.5 w-3.5 text-slate-500" />
              <span>Günlük şifreyi kopyala</span>
              {dailyPassword ? (
                <span className="ml-2 rounded bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-white">
                  {dailyPassword}
                </span>
              ) : null}
              {copied ? (
                <span className="ml-1 text-[10px] font-medium text-emerald-600">Kopyalandı</span>
              ) : null}
            </button>
          </div>
        </div>
      </section>

      {/* Companies & POCs */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6 space-y-16">
          {companies.map((company, index) => (
            <CompanySection key={company.id} company={company} index={index} />
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-slate-400 text-sm">
            Yeni bir POC çalışması başlatmak için{' '}
            <Link href="/" className="text-slate-900 hover:underline underline-offset-4">
              iletişime geçin
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
