import './globals.css'

import type { ReactNode } from 'react'

import { CoursesProvider } from '@/stores/CoursesProvider'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CoursesProvider>{children}</CoursesProvider>
      </body>
    </html>
  )
}
