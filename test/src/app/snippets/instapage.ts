import { MarketingApi } from '../MarketingApi'
import { submitAndRoute } from '../concierge'
import { Optional, Options } from '../types'

export const deployInstaPage = (options: Optional<Options, 'form'>) => {
  window.instapageFormSubmitSuccess = function (form: HTMLFormElement) {
    const marketingApi = new MarketingApi(options)
    const formData = {} as Record<string, string>

    for (let i = 0; i < form.elements.length; i++) {
      const field = form.elements[i] as HTMLInputElement
      if (field.name) {
        formData[field.name] = field.value
      }
    }
    submitAndRoute(
      {
        ...options,
        lead: {
          ...formData,
          ...options.lead,
        },
      },
      marketingApi
    )
  }
}
