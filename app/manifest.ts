import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sphere',
    short_name: 'Sphere',
    description: 'Персональний операційний центр цілей',
    lang: 'uk',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#fdfcfa',
    theme_color: '#7c3aed',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
