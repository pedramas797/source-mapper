import { PrelaunchApi } from './PrelaunchApi'
import { PopUp } from './PopUp'
import { Options } from './types'

interface JQueryObject {
  get: (index: number) => HTMLFormElement
}

export class MarketingApi {
  options: Options
  popup: PopUp
  prelaunch: PrelaunchApi
  form?: HTMLFormElement
  constructor(options: Options) {
    const defaultHandler = () => true // means process default redirect action
    this.options = Object.freeze(
      Object.assign(options, {
        onError: options.onError || defaultHandler,
        onSuccess: options.onSuccess || defaultHandler,
        onClose: options.onClose || defaultHandler,
        onRouting: options.onRouting || defaultHandler,
        onDisqualified: options.onDisqualified || defaultHandler,
        onLoadRouter: options.onLoadRouter || defaultHandler,
        onEnrichData: options.onEnrichData || defaultHandler,
        onBeforeSubmit: options.onBeforeSubmit || defaultHandler,
      })
    )
    this.popup = new PopUp(this, options.domElement, options.event)
    this.prelaunch = new PrelaunchApi(options.form, this.popup, this.options)
    this.prelaunch.enrichmentParentSelector =
      options.enrichmentParentSelector || options.enrichmentParentDivClassName
    this.form = options.form
    if (window.ChiliPiper) {
      window.ChiliPiper._marketingApi = this
    }
  }

  setForm(form?: HTMLFormElement | JQueryObject | Array<HTMLFormElement>) {
    if (!form) {
      return
    }
    if ('querySelector' in form) {
      this.form = form
      this.prelaunch.setForm(form)
    } else {
      const htmlFormElement = 'get' in form ? form.get(0) : form[0]
      this.prelaunch.setForm(htmlFormElement)
    }
  }

  get formId() {
    return this.options.formId as string | number
  }

  get formOptions() {
    return {
      by: this.options.by,
      formIds: this.options.formIds,
      formId: this.options.formId,
      debug: this.options.debug === true,
      trigger: this.options.trigger || 'ThirdPartyForm',
      domain: this.options.domain,
      router: this.options.router,
      locale: this.options.locale,
      ownerId: this.options.ownerId,
      accountId: this.options.accountId,
      type: this.options.type,
      disableRelation: this.options.disableRelation,
    }
  }

  async showCalendar(data: Record<string, any>, domElement?: HTMLElement) {
    let lead = data
    if (this.options.onBeforeSubmit) {
      const result = await this.options.onBeforeSubmit(data)
      if (typeof result === 'object') {
        lead = result
      }
    }
    this.popup.setData(lead, domElement)
    this.popup.showPopUp()
  }

  onError(err: any) {
    let errorText = 'An error has occured'
    if (err) {
      errorText = err.responseText || err.response || err
    }
    console.error('chilipiper >> ', errorText)

    const errorInfo = {
      message: errorText,
      error: err,
    }

    if (this.options.onError) {
      this.options.onError(errorInfo)
    }
  }

  onSuccess(data: Record<string, any>) {
    if (this.options.onSuccess) {
      this.options.onSuccess(data)
    }
  }

  onClose(hasBooked: boolean) {
    if (this.options.onClose && !hasBooked) {
      this.options.onClose()
    }
    this.prelaunch.removeEventListeners()
  }

  reduceForm(form?: HTMLFormElement) {
    if (form) {
      const mapped = Array.from(form.elements)
        .filter(
          (element: any) =>
            (element.type !== 'radio' || (element.type === 'radio' && element.checked === true)) &&
            element.type !== 'password'
        )
        .filter((element: any) => element.name && element.name !== 'password')
        .reduce((acc: Record<string, string>, element: any) => {
          const name = element.name?.includes('.') ? element.name.split('.').join('') : element.name
          // If the element has been enriched, we don't need to send it again
          if (element.hasAttribute('data-enriched')) {
            return acc
          }
          if (element.type === 'checkbox') {
            if (element.checked) {
              acc[name] = element.value
            }
          } else {
            acc[name] = element.value
          }
          return acc
        }, {})
      return mapped
    }
    return {}
  }
}
