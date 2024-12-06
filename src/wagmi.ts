import { http, cookieStorage, createConfig, createStorage } from 'wagmi'
import { localhost, baseSepolia } from 'wagmi/chains'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'
import { defineChain } from 'viem'

export function getConfig() {
  localhost.id = 31337

  return createConfig({
    chains: [localhost, baseSepolia],
    connectors: [
      injected(),
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [localhost.id]: http(),
      [baseSepolia.id]: http(),
    },
})
}

declare module 'wagmi' {
  interface Register {
    config: ReturnType<typeof getConfig>
  }
}
