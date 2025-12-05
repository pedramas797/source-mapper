import { MarketingApi } from '../MarketingApi'
import { submitAndRoute } from '../concierge'
import { log, debug, error } from '../logger'
import { Optional, Options } from '../types'

export const deployMarketo = (options: Optional<Options, 'form'>) => {
  if (window.MktoForms2) {
    const marketingApi = new MarketingApi(options)
    window.MktoForms2.whenReady((form: any) => {
      const submittedFormId = (form.getId().toString() as string).replace('mktoForm_', '')
      const formId = (() => {
        if (options.formId) {
          return String(options.formId).replace('mktoForm_', '')
        }
        if (options.formIds?.length) {
          return options.formIds
            .find(formId => String(formId).replace('mktoForm_', '') === submittedFormId)
            ?.replace('mktoForm_', '')
        }
        return submittedFormId
      })()
      debug('form ready', submittedFormId)
      const formElement = document.querySelector<HTMLFormElement>(
        `form[id="mktoForm_${formId}"], form[data-marketo-form-id="${formId}"]`
      )
      if (formElement) {
        log('form found', formId)
        marketingApi.prelaunch.enrichmentParentSelector = '.mktoFormRow'
        marketingApi.setForm(formElement)
      }
      form.onSuccess((values: any) => {
        if (formId === submittedFormId) {
          submitAndRoute(
            {
              ...options,
              map: true,
              lead: {
                ...values,
                ...(options.lead ?? {}),
              },
            },
            marketingApi
          )
          return false
        }
        error(`Submitted form ID ${submittedFormId} is not in the options`)
        return true
      })
    })
  } else {
    error('Marketo form not found')
  }
}
