import { FiscalProvider, FiscalConfig } from './fiscal-types'
import { MockFiscalProvider } from './providers/mock-fiscal'
import { IeRacuniProvider } from './providers/ie-racuni'

/**
 * Get the configured fiscal provider for Croatian fiscalization
 *
 * @param config - Optional configuration. If not provided, uses environment variables
 * @returns Configured fiscal provider instance
 */
export function getFiscalProvider(config?: Partial<FiscalConfig>): FiscalProvider {
  const providerName = config?.provider || process.env.FISCAL_PROVIDER || 'mock'

  switch (providerName) {
    case 'ie-racuni':
      return new IeRacuniProvider(config)

    case 'mock':
    default:
      return new MockFiscalProvider()
  }
}

/**
 * Test connection to the fiscal provider
 */
export async function testFiscalProvider(config?: Partial<FiscalConfig>): Promise<{
  success: boolean
  provider: string
  error?: string
}> {
  try {
    const provider = getFiscalProvider(config)

    if (provider.testConnection) {
      const connected = await provider.testConnection()
      return {
        success: connected,
        provider: provider.name,
        error: connected ? undefined : 'Connection test failed'
      }
    }

    return {
      success: true,
      provider: provider.name
    }
  } catch (error) {
    return {
      success: false,
      provider: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
