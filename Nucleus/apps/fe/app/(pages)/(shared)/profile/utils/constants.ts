import {
  Briefcase,
  Building,
  File,
  FileImage,
  FileText,
  FileVideo,
  Home,
  MapPin,
  Music,
  Phone,
} from 'lucide-react'

// File type icon mappings
export const FILE_TYPE_ICONS = {
  image: FileImage,
  profile_picture: FileImage,
  video: FileVideo,
  audio: Music,
  document: FileText,
} as const

export const MIME_TYPE_ICONS = {
  'image/': FileImage,
  'video/': FileVideo,
  'audio/': Music,
} as const

export const FILE_TYPE_COLORS = {
  image: 'text-blue-500',
  profile_picture: 'text-blue-500',
  video: 'text-purple-500',
  audio: 'text-green-500',
  document: 'text-orange-500',
  default: 'text-gray-500',
} as const

// Address type icon mappings
export const ADDRESS_TYPE_ICONS = {
  home: Home,
  office: Briefcase,
  work: Briefcase,
} as const

export const ADDRESS_TYPE_COLORS = {
  home: 'text-blue-500',
  office: 'text-green-500',
  work: 'text-green-500',
  default: 'text-gray-500',
} as const

// Phone type icon mappings
export const PHONE_TYPE_ICONS = {
  mobile: Phone,
  office: Building,
  work: Building,
  fax: Phone,
} as const

export const PHONE_TYPE_COLORS = {
  mobile: 'text-green-500',
  office: 'text-blue-500',
  work: 'text-blue-500',
  fax: 'text-gray-500',
  default: 'text-gray-500',
} as const

// Default fallback icon
export const DEFAULT_ICONS = {
  file: File,
  address: MapPin,
  phone: Phone,
} as const
