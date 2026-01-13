'use client'

import { useEffect, useRef, useState } from 'react'

interface MapPickerProps {
  latitude?: string
  longitude?: string
  onLocationSelect: (lat: number, lng: number) => void
  height?: string
}

export function MapPicker({
  latitude,
  longitude,
  onLocationSelect,
  height = '300px',
}: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapType, setMapType] = useState<'google' | 'simple'>('google')

  // Default location (Istanbul)
  const defaultLat = latitude ? parseFloat(latitude) : 41.0082
  const defaultLng = longitude ? parseFloat(longitude) : 28.9784

  // Check if Google Maps API key is available
  const hasGoogleMapsKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY &&
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY !== 'your_google_maps_api_key_here'

  useEffect(() => {
    const initMap = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (!mapRef.current) return

        // Try Google Maps first if API key is available
        if (hasGoogleMapsKey && mapType === 'google') {
          await initGoogleMap()
        } else {
          await initSimpleMap()
        }

        setIsLoading(false)
      } catch (err) {
        console.error('Error creating map:', err)
        // Fallback to simple map if Google Maps fails
        if (mapType === 'google') {
          setMapType('simple')
          await initSimpleMap()
        } else {
          setError('Failed to create map interface.')
        }
        setIsLoading(false)
      }
    }

    const initGoogleMap = async () => {
      // Dynamic import to avoid loading Google Maps if not needed
      const { setOptions, importLibrary } = await import('@googlemaps/js-api-loader')

      setOptions({
        key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        v: 'weekly',
        libraries: ['places'],
      })

      if (!mapRef.current) return

      const { Map: GoogleMap } = (await importLibrary('maps')) as google.maps.MapsLibrary
      const { Marker: GoogleMarker } = (await importLibrary('marker')) as google.maps.MarkerLibrary

      const initialLat = latitude ? parseFloat(latitude) : defaultLat
      const initialLng = longitude ? parseFloat(longitude) : defaultLng

      // Create Google Map
      const map = new GoogleMap(mapRef.current, {
        center: { lat: initialLat, lng: initialLng },
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      })

      // Create marker
      const marker = new GoogleMarker({
        position: { lat: initialLat, lng: initialLng },
        map,
        draggable: true,
        title: 'Drag me to select location',
      })

      // Add click listener to map
      map.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          const lat = event.latLng.lat()
          const lng = event.latLng.lng()

          marker.setPosition({ lat, lng })
          onLocationSelect(lat, lng)
        }
      })

      // Add drag listener to marker
      marker.addListener('dragend', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          const lat = event.latLng.lat()
          const lng = event.latLng.lng()
          onLocationSelect(lat, lng)
        }
      })
    }

    const initSimpleMap = async () => {
      if (!mapRef.current) return

      const initialLat = latitude ? parseFloat(latitude) : defaultLat
      const initialLng = longitude ? parseFloat(longitude) : defaultLng

      const mapContainer = mapRef.current
      mapContainer.innerHTML = ''

      // Create a simple interactive map interface
      const mapInterface = document.createElement('div')
      mapInterface.className =
        'relative w-full h-full bg-gray-100 rounded-lg border border-gray-300 overflow-hidden cursor-crosshair'

      // Map background with realistic map styling
      const mapBackground = document.createElement('div')
      mapBackground.className =
        'absolute inset-0 bg-gradient-to-br from-blue-100 via-green-50 to-yellow-50'

      // Create a more realistic map-like background
      mapBackground.style.backgroundImage = `
        radial-gradient(circle at 25% 25%, rgba(34, 197, 94, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 75% 25%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 25% 75%, rgba(168, 85, 247, 0.08) 0%, transparent 50%),
        radial-gradient(circle at 75% 75%, rgba(34, 197, 94, 0.12) 0%, transparent 50%),
        linear-gradient(45deg, rgba(156, 163, 175, 0.1) 1px, transparent 1px),
        linear-gradient(-45deg, rgba(156, 163, 175, 0.1) 1px, transparent 1px)
      `
      mapBackground.style.backgroundSize =
        '200px 200px, 200px 200px, 200px 200px, 200px 200px, 30px 30px, 30px 30px'

      // Add some "roads" and "landmarks"
      const mapOverlay = document.createElement('div')
      mapOverlay.className = 'absolute inset-0 pointer-events-none'
      mapOverlay.style.backgroundImage = `
        linear-gradient(90deg, rgba(107, 114, 128, 0.2) 2px, transparent 2px),
        linear-gradient(0deg, rgba(107, 114, 128, 0.2) 2px, transparent 2px),
        radial-gradient(circle at 30% 40%, rgba(34, 197, 94, 0.3) 8px, transparent 8px),
        radial-gradient(circle at 70% 30%, rgba(59, 130, 246, 0.3) 6px, transparent 6px),
        radial-gradient(circle at 60% 70%, rgba(168, 85, 247, 0.3) 5px, transparent 5px)
      `
      mapOverlay.style.backgroundSize =
        '80px 80px, 80px 80px, 150px 150px, 200px 200px, 180px 180px'
      mapOverlay.style.backgroundPosition = '0 0, 0 0, 0 0, 0 0, 0 0'

      // Coordinate display
      const coordDisplay = document.createElement('div')
      coordDisplay.className =
        'absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-sm font-mono border'
      coordDisplay.textContent = `${initialLat.toFixed(6)}, ${initialLng.toFixed(6)}`

      // Instructions
      const instructions = document.createElement('div')
      instructions.className =
        'absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg text-sm text-center border'
      instructions.innerHTML = `
        <div class="flex items-center justify-center gap-2 text-blue-700">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          <span><strong>Click anywhere</strong> to select coordinates</span>
        </div>
      `

      // Marker
      const marker = document.createElement('div')
      marker.className =
        'absolute w-10 h-10 -ml-5 -mt-10 pointer-events-none z-20 transition-all duration-300 transform hover:scale-110'
      marker.innerHTML = `
        <div class="relative">
          <svg class="w-10 h-10 text-red-500 drop-shadow-2xl" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <div class="absolute top-2 left-2 w-6 h-6 bg-white rounded-full flex items-center justify-center">
            <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      `

      // Position marker function
      const updateMarkerPosition = (lat: number, lng: number) => {
        const mapRect = mapBackground.getBoundingClientRect()
        // Simple projection with better centering
        const x = ((lng + 180) / 360) * mapRect.width
        const y = ((90 - lat) / 180) * mapRect.height

        marker.style.left = `${Math.max(20, Math.min(mapRect.width - 20, x))}px`
        marker.style.top = `${Math.max(40, Math.min(mapRect.height - 20, y))}px`
      }

      // Click handler
      const handleMapClick = (event: MouseEvent) => {
        const rect = mapBackground.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top

        // Convert pixel coordinates back to lat/lng
        const lng = (x / rect.width) * 360 - 180
        const lat = 90 - (y / rect.height) * 180

        // Clamp to reasonable bounds
        const clampedLat = Math.max(-85, Math.min(85, lat))
        const clampedLng = Math.max(-180, Math.min(180, lng))

        coordDisplay.textContent = `${clampedLat.toFixed(6)}, ${clampedLng.toFixed(6)}`
        updateMarkerPosition(clampedLat, clampedLng)

        onLocationSelect(clampedLat, clampedLng)
      }

      mapBackground.addEventListener('click', handleMapClick)

      // Assemble the map
      mapInterface.appendChild(mapBackground)
      mapInterface.appendChild(mapOverlay)
      mapInterface.appendChild(coordDisplay)
      mapInterface.appendChild(instructions)
      mapInterface.appendChild(marker)
      mapContainer.appendChild(mapInterface)

      // Position marker initially
      setTimeout(() => updateMarkerPosition(initialLat, initialLng), 100)
    }

    initMap()
  }, [mapType])

  // Update marker when coordinates change externally
  useEffect(() => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)

      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        // Update coordinate display if it exists
        const coordDisplay = mapRef.current?.querySelector('.font-mono')
        if (coordDisplay) {
          coordDisplay.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        }

        // Update marker position if it exists
        const marker = mapRef.current?.querySelector('.w-10.h-10')
        if (marker && mapRef.current) {
          const mapRect = mapRef.current.getBoundingClientRect()
          const x = ((lng + 180) / 360) * mapRect.width
          const y = ((90 - lat) / 180) * mapRect.height

          const markerElement = marker as HTMLElement
          markerElement.style.left = `${Math.max(20, Math.min(mapRect.width - 20, x))}px`
          markerElement.style.top = `${Math.max(40, Math.min(mapRect.height - 20, y))}px`
        }
      }
    }
  }, [latitude, longitude])

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300"
        style={{ height }}
      >
        <div className="text-center p-6">
          <div className="text-red-500 mb-2">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>Warning</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <p className="text-red-600 font-medium">Map Loading Error</p>
          <p className="text-gray-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10"
          style={{ height }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading Map...</p>
          </div>
        </div>
      )}

      <div ref={mapRef} className="w-full rounded-lg border border-gray-300" style={{ height }} />

      {!isLoading && (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex-1">
            {mapType === 'google' ? (
              <div className="p-2 bg-blue-50 rounded text-xs text-blue-700">
                <strong>Google Maps:</strong> Full interactive map with satellite view
              </div>
            ) : (
              <div className="p-2 bg-green-50 rounded text-xs text-green-700">
                <strong>Simple Map:</strong> Click anywhere to select coordinates. No API key
                required!
              </div>
            )}
          </div>

          {hasGoogleMapsKey && (
            <button
              type="button"
              onClick={() => setMapType(mapType === 'google' ? 'simple' : 'google')}
              className="ml-3 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
            >
              {mapType === 'google' ? 'Use Simple' : 'Use Google Maps'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
