import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import { type ReactNode } from 'react'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { cookieToInitialState } from 'wagmi'

import { getConfig } from '../wagmi'
import { Providers } from './providers'
import { ClientLocalizationProvider } from '../ClientLocalizationProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Net Volume Oracle Demo',
  description: 'Demo for querying a Net Volume Oracle implemented as a Uniswap V4 Hook.'
}

export default function RootLayout(props: { children: ReactNode }) {
  const initialState = cookieToInitialState(
    getConfig(),
    headers().get('cookie'),
  )
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppRouterCacheProvider>
            <ClientLocalizationProvider>
                <Providers initialState={initialState}>
                    {props.children}
                </Providers>
            </ClientLocalizationProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
