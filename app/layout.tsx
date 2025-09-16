import './globals.css'

import type { ReactNode } from 'react'

import { CourseProvider } from '@/stores/CourseProvider'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CourseProvider>{children}</CourseProvider>
      </body>
    </html>
  )
}
