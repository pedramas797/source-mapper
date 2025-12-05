import { MarketingApi } from '../MarketingApi'
import { submitAndRoute } from '../concierge'
import {
  HubSpotEvent,
  Optional,
  Options,
  HubspotFormData,
  HubspotSubmitionValues,
  HubspotFormFields,
  HubspotFormFieldDataV4,
} from '../types'
import { waitUntilElementExists } from '../utils'

const getData = (submissionValues: HubspotSubmitionValues = {}) => {
  return Object.keys(submissionValues).reduce(
    (acc, key) => {
      if (Array.isArray(submissionValues[key])) {
        acc[key] = submissionValues[key].toString().replaceAll(',', ';')
      } else {
        acc[key] = submissionValues[key]
      }
      return acc
    },
    {} as Record<string, string>
  )
}

// https://help.chilipiper.com/hc/en-us/articles/360053798493-Setting-up-Concierge-with-HubSpot-Forms
// https://legacydocs.hubspot.com/global-form-events
export const deployHubspotIframe = (
  options: Optional<Options, 'form'>,
  forms?: NodeListOf<HTMLFormElement>
) => {
  const formIds = options.formIds ?? []
  const marketingApi = new MarketingApi(options)
  let lead = {}

  window.addEventListener('hs-form-event:on-submission:success', (event: Event) => {
    const form = window.HubspotFormsV4?.getFormFromEvent(event)
    if (!form || (formIds.length > 0 && !formIds.includes(form.getFormId()))) {
      return
    }

    const onLoadFormValues = (values: HubspotFormFieldDataV4[]) => {
      lead = values.reduce(
        (acc, { name, value }) => {
          if (Array.isArray(value)) {
            value = value.join(';')
          }
          acc[name] = value
          return acc
        },
        {} as Record<string, string | number>
      )

      // eslint-disable-next-line no-console
      console.log(lead)
      submitAndRoute(
        {
          ...options,
          map: true,
          lead: {
            ...lead,
            ...(options.lead ?? {}),
          },
        },
        marketingApi,
        forms
      )
    }

    form
      .getFormFieldValues()
      .then(onLoadFormValues)
      .catch(err => {
        console.error('Error loading form values from Hubspot', err)
      })
  })

  window.addEventListener('message', (event: HubSpotEvent) => {
    if (formIds.length > 0 && !formIds.includes(String(event.data.id))) {
      return
    }
    if (
      ['hsFormCallback', 'hsCallsToActionCallback'].includes(event.data.type) &&
      ['onFormSubmitted', 'onCallToActionFormSubmitted'].includes(event.data.eventName)
    ) {
      if (Object.keys(lead).length === 0) {
        lead = getData((event.data.data as HubspotFormFields).submissionValues)
      }

      // eslint-disable-next-line no-console
      console.log(lead)
      submitAndRoute(
        {
          ...options,
          map: true,
          lead: {
            ...lead,
            ...(options.lead ?? {}),
          },
        },
        marketingApi,
        forms
      )
    }
    if (event.data.type === 'hsFormCallback' && event.data.eventName === 'onBeforeFormSubmit') {
      lead = ((event.data.data as HubspotFormData[]) || []).reduce(
        (acc, data) => {
          if (Array.isArray(data.value)) {
            acc[data.name] = data.value.toString().replaceAll(',', ';')
          } else {
            acc[data.name] = data.value
          }
          return acc
        },
        {} as Record<string, string>
      )
      // eslint-disable-next-line no-console
      console.log('onBeforeFormSubmit', lead)
    }

    if (event.data.type === 'hsFormCallback' && event.data.eventName === 'onFormReady') {
      const formSelector = options.formId
        ? `form[data-form-id="${options.formId}"]`
        : `form[data-form-id="${event.data.id}"]`
      waitUntilElementExists(formSelector, elements => marketingApi.setForm(elements[0]))
    }
  })
}

// https://help.chilipiper.com/hc/en-us/articles/15550017287315-Setting-up-Concierge-with-HubSpot-Pop-Up-Forms
export const deployHubspotPopup = (options: Optional<Options, 'form'>) => {
  const marketingApi = new MarketingApi(options)
  window.addEventListener('message', function (event) {
    if (event.data.conversionId) {
      const lead = {} as Record<string, string>
      const fields = (document.querySelectorAll(
        'form[data-form-id="' + options.formId + '"] input,select'
      ) ?? []) as unknown as HTMLInputElement[]
      for (let i = 0; i < fields.length; i++) {
        lead[fields[i].name] = fields[i].value
      }
      submitAndRoute(
        {
          ...options,
          map: true,
          lead: {
            ...lead,
            ...(options.lead ?? {}),
          },
        },
        marketingApi
      )
    }
  })
}
