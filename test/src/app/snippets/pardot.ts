import { PrelaunchApi } from '../PrelaunchApi'
import { MarketingApi } from '../MarketingApi'
import { submitAndRoute } from '../concierge'
import {
  Optional,
  Options,
  PardotDataReadyEvent,
  PardotEvent,
  PardotThankYouPageEvent,
} from '../types'
import { debug } from '../logger'
import { parseClassNames, stripText, inIframe } from './utils'

export const deployPardotFormHandlerOnThankYouPage = (options: Optional<Options, 'form'>) => {
  const leadValues: Record<string, string> = {}
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
    const marketingApi = new MarketingApi({
      ...options,
      domain: leadValues['CPTenantDomain'],
      router: leadValues['CPTenantRouter'],
      lead: {
        ...leadValues,
        ...(options.lead ?? {}),
      },
    })
    submitAndRoute({ ...marketingApi.options }, marketingApi)

    debug(leadValues, options)
  }
}
// Get Lead object from form fields
export const getLeadObject = (domain: string, router: string, form: HTMLFormElement) => {
  const data = {
    CPTenantDomain: domain,
    CPTenantRouter: router,
  } as Record<string, string>

  const fields = form.querySelectorAll('.form-field')

  fields.forEach(field => {
    const label = field.querySelector('label.field-label')
    const elem = field.querySelector('input, select, textarea')

    if (!elem) {
      return
    }

    if (elem.hasAttribute('data-enriched')) {
      debug(`not sending enriched value for element ${elem.id}`)
      return
    }

    const fieldName =
      parseClassNames(elem.parentElement?.className) ||
      stripText(label?.textContent || '') ||
      elem.id ||
      '[unnamed field]'

    let fieldValue = '[not provided]'

    if (elem instanceof HTMLSelectElement) {
      const selectedOption = elem.options[elem.selectedIndex]
      fieldValue =
        elem.selectedIndex === 0 ? '[not provided]' : (selectedOption?.text ?? '[not provided]')
    } else if (elem instanceof HTMLInputElement) {
      if (elem.type === 'checkbox') {
        fieldValue = String(elem.checked)
      } else if (elem.type === 'radio') {
        if (elem.checked) {
          fieldValue = elem.value
        } else {
          return
        }
      } else {
        fieldValue = elem.value?.trim() || '[not provided]'
      }
    } else if ('value' in elem && typeof elem.value == 'string') {
      fieldValue = elem.value.trim()
    }

    // Some customers mapped id instead of field name
    // so we are sending both
    if (elem.id) {
      data[elem.id] = fieldValue
    }
    data[fieldName] = fieldValue
  })
  // Log data and labels for debugging
  debug(data)
  return data
}

export const deployPardotOnLookAndFeel = (options: Optional<Options, 'form'>) => {
  // there are some pardot forms which ids are not pardot-form, so we need to use the action attribute to find the form
  const formId = options.formId ?? '#pardot-form, form[action*="https://go.pardot.com"]'
  const prelaunchApi = new PrelaunchApi()
  // Submit button click handler
  const submitHandler = (form: HTMLFormElement) => () => {
    const lead = getLeadObject(options.domain, options.router, form)
    if (prelaunchApi.routingId) {
      lead.routingId = prelaunchApi.routingId
    }
    debug(lead, options)
    if (inIframe()) {
      debug('pardot iframe detected, sending data to parent')
      const event: PardotDataReadyEvent = {
        message: 'PARDOT_DATA_READY',
        data: lead,
      }
      window.parent.postMessage(event, '*')
    } else {
      debug('pardot iframe not detected, sending data to form as it seems a native pardot form')
      form.action = `${form.action}?${new URLSearchParams(lead).toString()}`
    }
  }
  // Retry adding the form event listener
  const findFormAndAddListener = (count = 1) => {
    const form = document.querySelector(formId) as HTMLFormElement
    if (form) {
      prelaunchApi.setForm(form)
      form.addEventListener('submit', submitHandler(form))
      return
    }
    if (
      (typeof options.retryFormSearch !== 'undefined' ? options.retryFormSearch : true) &&
      count < 10
    ) {
      setTimeout(() => {
        findFormAndAddListener(count + 1)
      }, 1000)
    } else {
      debug('no form found on this page, id used - ' + formId, options)
    }
  }
  findFormAndAddListener()
}

export const deployPardotIframeOnThankYouPage = () => {
  const event: PardotThankYouPageEvent = {
    message: 'PARDOT_FORM_SUCCESS',
    data: window.location.search,
  }
  window.parent.postMessage(event, '*')
}

const getLeadObjectFromQueryParams = (queryParams: string) => {
  const urlParams = new URLSearchParams(queryParams)
  const entries = urlParams.entries()
  const leadObj: Record<string, string> = {}
  for (const [key, value] of entries) {
    leadObj[key] = value
  }
  return leadObj
}

export const deployPardotIframeOnParentPage = (options: Optional<Options, 'form'>) => {
  const marketingApi = new MarketingApi(options)
  const pardotIframe = document.querySelector('iframe[src*="pardot"]') as HTMLIFrameElement
  if (pardotIframe) {
    const forwardEvents = (event: MessageEvent) => {
      if (event.data.type === 'PERFORM_PRELAUNCH' && marketingApi.popup.iframe) {
        marketingApi.popup.iframe.contentWindow?.postMessage({ ...event.data }, '*')
      } else {
        pardotIframe.contentWindow?.postMessage({ ...event.data }, '*')
      }
    }
    window.addEventListener('message', forwardEvents)
  } else {
    debug('no pardot iframe detected, sending data to form as it seems a native pardot form')
    const lead = getLeadObjectFromQueryParams(window.location.search)
    if (Object.keys(lead).length > 0) {
      debug('lead object found in query params, sending data to form', lead)
      submitAndRoute(
        {
          ...options,
          lead,
        },
        marketingApi
      )
    }
  }
  let leadObj: Record<string, string> = {}
  // Below is the event listener that will listen for the Pardot Events
  const receiveMessage = (event: PardotEvent) => {
    if (!event.data?.message) {
      return
    }
    if (event.data.message === 'PARDOT_DATA_READY' && event.data.data) {
      leadObj = event.data.data as unknown as Record<string, string>
    }
    if (event.data.message === 'PARDOT_FORM_SUCCESS') {
      // If DATA_READY doesn't send the data, we get it from search
      if (Object.keys(leadObj).length === 0) {
        const uri = decodeURIComponent(event.data.data.replace(/\+/g, ' '))
        leadObj = getLeadObjectFromQueryParams(uri)
      }

      submitAndRoute(
        {
          domain: leadObj['CPTenantDomain'] || options.domain,
          router: leadObj['CPTenantRouter'] || options.router,
          lead: {
            ...leadObj,
            ...(options.lead ?? {}),
          },
        },
        marketingApi
      )
    }
  }
  window.addEventListener('message', receiveMessage, false)
}
