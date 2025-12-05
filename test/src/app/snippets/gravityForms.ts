import { MarketingApi } from '../MarketingApi'
import { submitAndRoute } from '../concierge'
import { Optional, Options } from '../types'

export const deployGravityFormsOnThankYouPage = (options: Optional<Options, 'form'>) => {
  const leadValues: Record<string, string> = {}
  const marketingApi = new MarketingApi(options)
  const uri = decodeURIComponent(document.location.search.replace(/\+/g, ' '))
  const urlParams = new URLSearchParams(uri)
  const entries = urlParams.entries()
  let valid = false
  for (const [key, value] of entries) {
    if (key.toLowerCase().includes('email') && value.includes('@')) {
      leadValues[key] = value.replaceAll(' ', '+') // fix spaces for emails
      valid = true
    } else {
      leadValues[key] = value
    }
  }
  if (valid) {
    submitAndRoute(
      {
        ...options,
        lead: {
          ...leadValues,
          ...(options.lead ?? {}),
        },
        map: true,
      },
      marketingApi
    )
    // eslint-disable-next-line no-console
    console.log(leadValues)
  }
}

export const deployGravityFormsOnFormPage = (options: Optional<Options, 'form'>) => {
  const marketingApi = new MarketingApi(options)
  submitAndRoute(
    {
      ...options,
      map: true,
    },
    marketingApi
  )
}
