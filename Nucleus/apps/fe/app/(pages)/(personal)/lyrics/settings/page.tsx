'use client'

import { ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useStore } from '@/app/_store/lyricStore'

export default function SettingsPage() {
  const store = useStore()
  const [showResetModal, setShowResetModal] = useState(false)

  const handleResetData = () => {
    // Clear localStorage
    localStorage.removeItem('lyrics-store')

    // Reload page to reinitialize with default data
    window.location.reload()
  }

  return (
    <div
      className="w-full h-full p-6 overflow-auto"
      style={{ backgroundColor: store.settings.backgroundColor }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/lyrics"
            className="p-3 hover:bg-gray-200 rounded-lg transition-all"
            aria-label="Back to lyrics"
          >
            <ArrowLeft size={32} className="text-gray-700" />
          </Link>
          <h1 className="text-3xl font-bold" style={{ color: store.settings.textColor }}>
            Settings
          </h1>
        </div>

        <div className="space-y-6 bg-white rounded-xl shadow-lg p-6">
          {/* Background Color */}
          <div className="space-y-2">
            <label htmlFor="bgColor" className="block text-lg font-semibold text-gray-900">
              Background Color
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                id="bgColor"
                value={store.settings.backgroundColor}
                onChange={(e) => store.updateSettings({ backgroundColor: e.target.value })}
                className="w-20 h-12 rounded border-2 border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={store.settings.backgroundColor}
                onChange={(e) => store.updateSettings({ backgroundColor: e.target.value })}
                className="flex-1 px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="#FFFFFF"
              />
            </div>
          </div>

          {/* Text Color */}
          <div className="space-y-2">
            <label htmlFor="textColor" className="block text-lg font-semibold text-gray-900">
              Text Color
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                id="textColor"
                value={store.settings.textColor}
                onChange={(e) => store.updateSettings({ textColor: e.target.value })}
                className="w-20 h-12 rounded border-2 border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={store.settings.textColor}
                onChange={(e) => store.updateSettings({ textColor: e.target.value })}
                className="flex-1 px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="#1F2937"
              />
            </div>
          </div>

          {/* Default Font Size */}
          <div className="space-y-2">
            <label htmlFor="fontSize" className="block text-lg font-semibold text-gray-900">
              Default Font Size: {store.settings.fontSize}px
            </label>
            <input
              type="range"
              id="fontSize"
              min={12}
              max={72}
              value={store.settings.fontSize}
              onChange={(e) => store.updateSettings({ fontSize: Number(e.target.value) })}
              className="w-full h-8"
              style={{ accentColor: '#3B82F6' }}
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>Small (12px)</span>
              <span>Large (72px)</span>
            </div>
          </div>

          {/* Default Alignment */}
          <div className="space-y-2">
            <span className="block text-lg font-semibold text-gray-900">Default Alignment</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => store.updateSettings({ defaultCentered: false })}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition border-2 ${
                  store.settings.defaultCentered
                    ? 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                    : 'border-purple-500 text-purple-600 bg-purple-50 hover:border-purple-600'
                }`}
                aria-pressed={!store.settings.defaultCentered}
              >
                Left Align
              </button>
              <button
                type="button"
                onClick={() => store.updateSettings({ defaultCentered: true })}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition border-2 ${
                  store.settings.defaultCentered
                    ? 'border-purple-500 text-purple-600 bg-purple-50 hover:border-purple-600'
                    : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                }`}
                aria-pressed={store.settings.defaultCentered}
              >
                Center Align
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Songs use this by default unless you toggle alignment inside the lyric view.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-gray-200 my-4" />

          {/* Title Styling Section */}
          <h2 className="text-xl font-bold text-gray-900 mb-4">Song Title Styling</h2>

          {/* Title Font Size */}
          <div className="space-y-2">
            <label htmlFor="titleFontSize" className="block text-lg font-semibold text-gray-900">
              Title Font Size: {store.settings.titleFontSize}px
            </label>
            <input
              type="range"
              id="titleFontSize"
              min={16}
              max={48}
              value={store.settings.titleFontSize}
              onChange={(e) => store.updateSettings({ titleFontSize: Number(e.target.value) })}
              className="w-full h-8"
              style={{ accentColor: '#3B82F6' }}
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>Small (16px)</span>
              <span>Large (48px)</span>
            </div>
          </div>

          {/* Title Color */}
          <div className="space-y-2">
            <label htmlFor="titleColor" className="block text-lg font-semibold text-gray-900">
              Title Color
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                id="titleColor"
                value={store.settings.titleColor}
                onChange={(e) => store.updateSettings({ titleColor: e.target.value })}
                className="w-20 h-12 rounded border-2 border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={store.settings.titleColor}
                onChange={(e) => store.updateSettings({ titleColor: e.target.value })}
                className="flex-1 px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="#1F2937"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-gray-200 my-4" />

          {/* Band Name Styling Section */}
          <h2 className="text-xl font-bold text-gray-900 mb-4">Band Name Styling</h2>

          {/* Band Font Size */}
          <div className="space-y-2">
            <label htmlFor="bandFontSize" className="block text-lg font-semibold text-gray-900">
              Band Font Size: {store.settings.bandFontSize}px
            </label>
            <input
              type="range"
              id="bandFontSize"
              min={12}
              max={32}
              value={store.settings.bandFontSize}
              onChange={(e) => store.updateSettings({ bandFontSize: Number(e.target.value) })}
              className="w-full h-8"
              style={{ accentColor: '#3B82F6' }}
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>Small (12px)</span>
              <span>Large (32px)</span>
            </div>
          </div>

          {/* Band Color */}
          <div className="space-y-2">
            <label htmlFor="bandColor" className="block text-lg font-semibold text-gray-900">
              Band Color
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                id="bandColor"
                value={store.settings.bandColor}
                onChange={(e) => store.updateSettings({ bandColor: e.target.value })}
                className="w-20 h-12 rounded border-2 border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={store.settings.bandColor}
                onChange={(e) => store.updateSettings({ bandColor: e.target.value })}
                className="flex-1 px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="#6B7280"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-gray-200 my-4" />

          {/* Default Scroll Speed */}
          <div className="space-y-2">
            <label htmlFor="scrollSpeed" className="block text-lg font-semibold text-gray-900">
              Default Scroll Speed: {store.settings.defaultScrollSpeed} px/s
            </label>
            <input
              type="range"
              id="scrollSpeed"
              min={1}
              max={50}
              value={store.settings.defaultScrollSpeed}
              onChange={(e) => store.updateSettings({ defaultScrollSpeed: Number(e.target.value) })}
              className="w-full h-8"
              style={{ accentColor: '#3B82F6' }}
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>Slow (1)</span>
              <span>Fast (50)</span>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2 mt-8">
            <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
            <div
              className="p-6 rounded-lg border-2 border-gray-300 space-y-4"
              style={{
                backgroundColor: store.settings.backgroundColor,
              }}
            >
              {/* Band Name Preview */}
              <p
                className="font-medium leading-tight"
                style={{
                  fontSize: `${store.settings.bandFontSize}px`,
                  color: store.settings.bandColor,
                }}
              >
                Sample Band Name
              </p>

              {/* Title Preview */}
              <h3
                className="font-semibold leading-tight"
                style={{
                  fontSize: `${store.settings.titleFontSize}px`,
                  color: store.settings.titleColor,
                }}
              >
                Sample Song Title
              </h3>

              {/* Lyrics Preview */}
              <div
                className="mt-4"
                style={{
                  fontSize: `${store.settings.fontSize}px`,
                  color: store.settings.textColor,
                  textAlign: store.settings.defaultCentered ? 'center' : 'left',
                }}
              >
                <p>This is how your lyrics will appear</p>
                <p className="mt-2">With the selected font size and colors</p>
              </div>
            </div>
          </div>

          {/* Reset Data */}
          <div className="space-y-2 mt-8 pt-8 border-t-2 border-gray-200">
            <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
            <p className="text-sm text-gray-600">
              Reset all data including songs, formats, and settings to factory defaults.
            </p>
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="w-full px-6 py-4 bg-red-50 hover:bg-red-100 border-2 border-red-200 hover:border-red-300 rounded-lg transition-all flex items-center justify-center gap-3 group"
            >
              <Trash2
                size={20}
                className="text-red-600 group-hover:scale-110 transition-transform"
              />
              <span className="text-base font-semibold text-red-600">Reset All Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowResetModal(false)}
            aria-label="Close modal"
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 slide-in-from-bottom-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Reset All Data?</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This will permanently delete:
              </p>
              <ul className="list-disc list-inside text-sm text-red-700 mt-2 space-y-1">
                <li>All songs and lyrics</li>
                <li>Text formatting</li>
                <li>Custom settings</li>
                <li>Song order</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetData}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
