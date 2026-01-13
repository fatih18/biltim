import { Button } from '@nextui-org/react'
import Image from 'next/image'

export function Header() {
  return (
    <header className="w-full bg-white py-4 px-6 sticky top-0 z-50 shadow-lg backdrop-blur-md bg-white/90">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative bg-blue-600 rounded-full p-2 shadow-md">
            <Image
              src="/humanis-h-logo-white.svg"
              alt="HUMANIS Logo"
              width={32}
              height={32}
              priority
              className="h-8 w-auto"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-blue-600 font-bold text-xl tracking-tight">HUMANIS</span>
            <span className="text-gray-500 text-xs font-medium -mt-1">Sağlık Teknolojileri</span>
          </div>
        </div>
        <nav className="hidden md:flex items-center space-x-8">
          <li className="text-gray-700 hover:text-blue-600 font-medium text-sm transition-colors duration-200 relative group">
            Ana Sayfa
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
          </li>
          <li className="text-gray-700 hover:text-blue-600 font-medium text-sm transition-colors duration-200 relative group">
            Hizmetler
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
          </li>
          <li className="text-gray-700 hover:text-blue-600 font-medium text-sm transition-colors duration-200 relative group">
            Kurumsal
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
          </li>
          <li className="text-gray-700 hover:text-blue-600 font-medium text-sm transition-colors duration-200 relative group">
            İletişim
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
          </li>
          <Button className="bg-blue-600 text-white font-medium text-sm px-4 py-2 rounded-full shadow-md hover:bg-blue-700 transition-colors ml-4">
            Giriş Yap
          </Button>
        </nav>
        <button type="button" className="md:hidden text-gray-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <title>Menu</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>
    </header>
  )
}
