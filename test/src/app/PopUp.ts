import { stringify } from 'qs'
import { environment } from '../environment'
import { Options } from './types'
import { MarketingApi } from './MarketingApi'

/* global document window navigator */
interface GlobalEvent {
  callback: (event: any) => any
  event: string
}
// eslint-disable-next-line no-useless-escape
const urlRegex = /^(?:https:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?%#[\]@!\$&'\(\)\*\+,;=.]+$/m

const redirectIfValidUrl = (url: string) => {
  if (!urlRegex.test(url)) {
    console.error('Invalid redirect URL')
    return false
  }
  if (!url.startsWith('https')) {
    window.location.href = `https://${url}`
  } else {
    window.location.href = url
  }
  return true
}

export class PopUp {
  form: MarketingApi
  options: Options
  data: Record<string, any>
  domElement?: HTMLElement
  crmEvent?: any
  redirect: any = {}
  layout?: HTMLDivElement
  iframe?: HTMLIFrameElement
  globalEvents: GlobalEvent[] = []
  isListeningForDataUpdates: boolean
  isPopupOpen: boolean

  constructor(formType: MarketingApi, domElement?: HTMLElement, crmEvent?: any) {
    this.form = formType
    this.options = formType.options
    this.isPopupOpen = false
    this.data = {}
    this.domElement = domElement
    this.crmEvent = crmEvent
    this.redirect = {}
    this.isListeningForDataUpdates = false

    //@ts-ignore TODO: add explanation
    if (window.addEventListener) {
      this.addAndRegisterListener('message', this.onMessage)
      //@ts-ignore TODO: add explanation
    } else if (window.attachEvent) {
      //@ts-ignore TODO: add explanation
      window.attachEvent('onmessage', this.onMessage, false)
    }
    this.buildLayout()
  }

  setData = (formData: Record<string, any>, domElement?: HTMLElement) => {
    this.data = formData
    this.domElement = domElement
    this.redirect = {}
  }

  onMessage = (event: MessageEvent) => {
    if (event.data?.action === 'close') {
      this.close()
    } else if (event.data.action === 'REDIRECT') {
      if (!redirectIfValidUrl(event.data.url)) {
        this.removeLayout()
      }
    } else if (event.data.action === 'booking-confirmed') {
      this.form.onSuccess(event.data.args)
    } else if (event.data.action === 'error') {
      this.form.onError(event.data.args)
    } else if (event.data.action === 'prospect-routed') {
      this.options.onRouted?.(event.data.args)
    } else if (event.data.action === 'prospect-disqualified') {
      this.options.onDisqualified?.()
    } else if (event.data.action === 'routing') {
      this.options.onRouting?.()
    } else if (event.data.action === 'started-listening-form-data-update') {
      this.isListeningForDataUpdates = true
    } else if (event.data.action === 'stopped-listening-form-data-update') {
      this.isListeningForDataUpdates = false
    }
  }

  removeLayout() {
    if (this.layout) {
      if (this.layout.parentNode) {
        this.layout.parentNode?.removeChild(this.layout)
      } else {
        this.getParentNode().removeChild(this.layout)
      }
      this.layout = undefined
      this.isPopupOpen = false
      this.data = {}
    }
  }

  close() {
    this.removeLayout()
    this.buildLayout()
    this.form.onClose(false)
    this.isListeningForDataUpdates = true
  }

  destroy() {
    if (!this.isPopupOpen) {
      return
    }
    // eslint-disable-next-line no-console
    console.group(
      'Concierge called twice, removing first popup. Please, remove one of the calls to avoid unexpected behavior.'
    )
    // eslint-disable-next-line no-console
    console.trace()
    // eslint-disable-next-line no-console
    console.groupEnd()
    this.removeLayout()
    this.removeEventListeners()
  }

  getParentNode() {
    if (!this.domElement) {
      return document.body
    }
    if (typeof this.domElement === 'string') {
      const element = document.querySelector(this.domElement)
      if (element) {
        return element
      }
      return document.body
    }
    return this.domElement
  }

  getOptions() {
    return {
      by: this.options.by,
      locale: this.options.locale,
      accountId: this.options.accountId,
      closeOnOutside: this.options.closeOnOutside,
      dynamicRedirectLink: this.options.dynamicRedirectLink,
      caseId: this.options.caseId,
      assigneeCrmId: this.options.assigneeCrmId,
      domElement: this.options.domElement,
      type: this.options.type,
      trigger: this.options.trigger || 'ThirdPartyForm',
      ownerId: this.options.ownerId,
      objectId: this.options.objectId,
      attendees: this.options.attendees,
      // as we use url query param, will add event_ preffix to the object and parse it
      // on booking app
      ...Object.keys(this.options.event || {}).reduce(
        (acc, key) => {
          acc[`event_${key}`] = this.options.event?.[key] as string
          return acc
        },
        {} as Record<string, string>
      ),
      meetingTypeId: this.options.meetingTypeId,
      campaignId: this.options.campaignId,
      status: this.options.status,
      opportunityId: this.options.opportunityId,
      disableRelation: this.options.disableRelation,
    }
  }

  getPopUpData() {
    const options = this.getOptions()
    delete this.data['']
    delete this.data['hs_context']

    // this is to decode data like apostrophes
    const decodeData = (text?: string) => {
      if (!text) return text
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'text/html')
      return doc.documentElement.textContent
    }

    const decodedData = Object.fromEntries(
      Object.entries(this.data).map(([key, value]) => [key, decodeData(value)])
    )
    const parsedData = {
      ...decodedData,
      ...options,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }

    return { ...parsedData, sourceUrl: window.location.href }
  }

  getPopUpBaseUrl() {
    const { domain: tenant, router: conciergeSlug } = this.options

    if (!conciergeSlug) {
      console.error('chilipiper >> ', 'No router slug provided')
    }

    if (!tenant) {
      console.error('chilipiper >> ', 'No domain provided')
    }

    const baseUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://chilipiper.team:4004'
        : `https://${tenant}.${environment.domain}`

    // fire only accepts lowercased slugs but users coming from legacy may have
    // capital letters in their slugs so we force lowercase
    return `${baseUrl}/concierge-router/${conciergeSlug.toLowerCase()}`
  }

  getPopUpUrl() {
    const parsedData = this.getPopUpData()

    const queryString = stringify(
      Object.fromEntries(
        Object.entries(parsedData).filter(
          ([_, value]) => value !== undefined && value !== '' && value !== null
        )
      )
    )
    const link = `${this.getPopUpBaseUrl()}?${queryString}`

    // eslint-disable-next-line no-console
    console.log({
      data: parsedData,
      link,
    })

    return link
  }

  buildLayout() {
    if (!this.layout) {
      const div = document.createElement('div')
      if (!this.domElement) {
        div.style.top = '0'
        div.style.left = '0'
        div.style.right = '0'
        div.style.bottom = '0'
        div.style.position = 'fixed'
      } else {
        div.style.position = 'relative'
        div.style.width = '100%'
        div.style.height = '100%'
      }
      div.style.zIndex = '-1'
      this.getParentNode().appendChild(div)
      this.layout = div
    }

    // we are building the iframe
    // in order to preload it
    const iframeElement = document.createElement('iframe')
    iframeElement.className = 'chilipiper-frame'
    iframeElement.src = this.getPopUpUrl()
    iframeElement.style.border = '0'
    iframeElement.style.overflow = 'hidden'
    iframeElement.style.height = '0'
    iframeElement.style.width = '1px'
    iframeElement.style.minWidth = '0'

    this.layout.appendChild(iframeElement)
    this.iframe = iframeElement
  }

  updateFormData(attempt = 1) {
    const iframe = this.iframe

    if (!iframe) {
      return
    }

    if (this.isListeningForDataUpdates || attempt === 30) {
      const popupData = this.getPopUpData()
      // eslint-disable-next-line no-console
      console.log({ data: popupData })
      return iframe.contentWindow?.postMessage(
        { type: 'UPDATE_CONCIERGE_FORM_DATA', data: stringify({ ...popupData }) },
        '*'
      )
    }

    setTimeout(() => {
      this.updateFormData(attempt + 1)
    }, 100 * attempt)
  }

  showPopUp() {
    const div = this.layout
    const iframe = this.iframe

    if (!this.options.domain) {
      this.form.onError('The domain cannot be empty')
      return
    }

    if (div && iframe) {
      div.style.zIndex = '99999'
      // as we already prefetched the url and created the iframe
      // this will just update the url and the iframe dimensions
      const handleFocusIframe = () => {
        iframe.style.height = '100%'
        iframe.style.minWidth = '100%'
        this.isPopupOpen = true
        return iframe.focus()
      }
      handleFocusIframe()
      this.updateFormData()
    }
  }

  addAndRegisterListener = (event: string, callback: (event: any) => any) => {
    this.globalEvents.push({ event, callback })
    window.addEventListener(event, callback)
  }

  removeEventListeners = () => {
    this.globalEvents.forEach(({ event, callback }) => {
      window.removeEventListener(event, callback)
    })
    this.globalEvents = []
  }
}
