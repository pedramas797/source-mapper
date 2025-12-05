import 'whatwg-fetch'
import { initSentryClient, captureException } from '../sentryClient'
import { MarketingApi } from './MarketingApi'
import {
  executeWhenFormLoads,
  throttle,
  executeWhenDOMContentLoaded,
  dispatchEnrichDataEvent,
} from './utils'
import { MarketoForm } from './forms/MarketoForm'
import { PardotForm } from './forms/PardotForm'
import { HtmlForm } from './forms/HtmlForm'
import { HubspotForm } from './forms/HubspotForm'
import { Optional, Options } from './types'
import { deployRouter } from './snippets'
import { error, log } from './logger'

// eslint-disable-next-line no-console
console.log('Concierge version', process.env.APP_VERSION)

initSentryClient()

const createIntegration = (form: HTMLFormElement, options: Optional<Options, 'form'>) => {
  const formId = form.id ?? ''
  //@ts-ignore TODO: add reason
  const isHubspotForm = typeof hbspt !== 'undefined' && formId.includes('hsForm')
  const isMarketo = formId.includes('mktoForm') && window.MktoForms2 !== undefined
  const isPardot = formId === 'pardot-form' || formId.includes('gform')
  if (isHubspotForm) {
    return new HubspotForm({ ...options, form: form })
  }
  if (isMarketo) {
    return new MarketoForm({ form, formId, ...options })
  }
  if (isPardot) {
    return new PardotForm({ form, ...options })
  }
  return new HtmlForm({ form, ...options })
}

const integrateForms = (options: Optional<Options, 'form'>, forms: NodeListOf<HTMLFormElement>) => {
  const integration = Array.from(forms).map(form => createIntegration(form, options))
  return integration
}

const showCalendarHubspotMobile = (options: Options) => {
  const hubspotData = JSON.parse(window.localStorage.getItem('hubspotData') || '')
  const hubspotForm = new HubspotForm({ ...options })
  hubspotForm.showCalendar(hubspotData, options.domElement)
}

let IntegrationsRetry = 20
export const bookMeeting = (
  options: Optional<Options, 'form'>,
  forms: NodeListOf<HTMLFormElement>
) => {
  if (forms.length > 0) {
    integrateForms(options, forms)
  } else if (
    window.location.href.includes('hsFormGuid') &&
    window.location.href.includes('submissionGuid')
  ) {
    showCalendarHubspotMobile(options as Options)
  } else if (IntegrationsRetry > 0) {
    IntegrationsRetry -= 1
    setTimeout(() => {
      bookMeeting(options, forms)
    }, 1000)
  } else {
    error('Could not integrate [form absent]')
  }
}

const showCalendarAfterCheck =
  (marketingApi: MarketingApi, formData: Record<string, string>) =>
  (options: Optional<Options, 'form'>) => {
    marketingApi.showCalendar(formData, options.domElement)
  }

export const submitAndRoute = throttle(
  (
    options: Optional<Options, 'form'>,
    marketingApi: MarketingApi,
    forms?: NodeListOf<HTMLFormElement>
  ) => {
    // Some customers might run submit during onError callback, so we need to clear the state and DOM
    // to avoid any possible spamming
    if (window.ChiliPiper?._marketingApi) {
      window.ChiliPiper?._marketingApi.popup.destroy()
    }
    try {
      log('Submitting and routing form with options: ', options)
      const form = options.form || (forms ? forms[0] : undefined)
      marketingApi.setForm(form)
      if (options.lead) {
        marketingApi.showCalendar(options.lead, options.domElement)
      } else {
        const formData = Array.from(form?.elements ?? []).reduce(
          (acc: Record<string, string>, x) => {
            acc[(x as HTMLInputElement).name] = (x as HTMLInputElement).value
            return acc
          },
          {}
        )
        // for form on page https://verse.io/schedule-a-demo/ the field values are empty if check is done before mapping
        showCalendarAfterCheck(marketingApi, formData)(options)
      }
    } catch (err) {
      captureException(err)
    }
  }
)

export const showCalendar = (
  options: Optional<Options, 'form'>,
  forms?: NodeListOf<HTMLFormElement>
) => {
  const dataPardot = JSON.parse(window.localStorage.getItem('dataPardot') || '{}')
  const form = options.form || (forms ? forms[0] : undefined)
  const marketingApi = new MarketingApi({ form, ...options })
  marketingApi.showCalendar(dataPardot, options.domElement)
}

const getQueryVariables = () => {
  const query = window.location.search.substring(1)
  const vars = query.split('&')
  const varObject: Record<string, string> = {}
  for (let i = 0; i < vars.length; i++) {
    const pair = vars[i].split('=')
    varObject[pair[0]] = decodeURIComponent(pair[1])
  }
  return varObject
}

const getQueryVariable = (variable: string) => {
  const variables = getQueryVariables()

  return variables[variable] || false
}

const queryVariableIncludes = (value: string) => {
  const variables = getQueryVariables()

  return Object.keys(variables).some(key => key.toLowerCase().includes(value.toLowerCase()))
}

export const getQuery = (options: Optional<Options, 'form'>) => {
  const checkBeforeRouting = options.checkInclusive ? queryVariableIncludes : getQueryVariable

  if (checkBeforeRouting(options.queryVariable || 'email')) {
    const newOptions = {
      ...options,
      lead: {
        ...(options.lead || {}),
        ...getQueryVariables(),
      },
    } as Optional<Options, 'form'>
    const marketingApi = new MarketingApi(newOptions)
    submitAndRoute({ ...newOptions }, marketingApi)
  }
}

export const ChiliPiper = {
  getQuery: (
    domain: string,
    router: string,
    options: Optional<Options, 'domain' | 'router' | 'form'> = {}
  ) => executeWhenDOMContentLoaded(() => getQuery({ domain, router, ...options })),
  scheduling: (
    domain: string,
    router: string,
    options: Optional<Options, 'domain' | 'router' | 'form'> = {}
  ) => executeWhenFormLoads(bookMeeting)({ domain, router, ...options }),
  submit: (
    domain: string,
    router: string,
    options: Optional<Options, 'domain' | 'router' | 'form'> = {}
  ) =>
    executeWhenFormLoads((options, forms) => {
      const marketingApi = window.ChiliPiper?._marketingApi || new MarketingApi(options)
      const newOptions = {
        ...marketingApi.options,
        ...options,
        lead: options.lead,
      }
      marketingApi.options = newOptions
      return submitAndRoute(newOptions, marketingApi, forms)
    })({ domain, router, ...options }),
  deploy: (
    domain: string,
    router: string,
    options: Optional<Options, 'domain' | 'router' | 'form'> = {}
  ) => deployRouter({ domain, router, ...options }),
  setForm: (form: HTMLFormElement) => {
    window.ChiliPiper?._marketingApi.setForm(form)
  },
  init: (options: Options) => {
    new MarketingApi(options)
  },
  enrich: (email: string) => {
    if (!window.ChiliPiper?._marketingApi) {
      throw new Error('Script not initialized, please run ChiliPiper.init() first')
    }
    dispatchEnrichDataEvent(email)
  },
  closePopup: () => {
    if (window.ChiliPiper?._marketingApi) {
      window.ChiliPiper._marketingApi.popup.close()
    }
  },
}

if (window.ChiliPiper) {
  Object.keys(window.ChiliPiper).forEach(key => {
    //@ts-ignore TODO: add reason
    if (window.ChiliPiper[key].cp?.length) {
      //@ts-ignore TODO: add reason
      window.ChiliPiper[key].cp.forEach(param => ChiliPiper[key](...param))
    }
    //@ts-ignore For the sake of backwards compatibility
    if (window.ChiliPiper[key].q?.length) {
      //@ts-ignore For the sake of backwards compatibility
      window.ChiliPiper[key].q.forEach(param => ChiliPiper[key](...param))
    }
  })
}

;(global as any).ChiliPiper = ChiliPiper
