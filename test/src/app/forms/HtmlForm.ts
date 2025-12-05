import { fetch as fetchPolyfill } from 'whatwg-fetch'
import { Options } from '../types'
import { MarketingApi } from '../MarketingApi'

export class HtmlForm extends MarketingApi {
  constructor(options: Options) {
    super(options)
    this.addSubmitHandler()
  }

  addSubmitHandler() {
    this.form?.addEventListener('submit', (event: Event) => this.handleSubmit(event))
  }

  handleSubmit(event: Event) {
    event.preventDefault()
    const url = this.postUrl()
    if (url) {
      this.sendData(url, this.formData)
    }
    this.showCalendar(this.formData)
  }

  get formData() {
    return this.reduceForm(this.form)
  }

  sendData(url: string, data: Record<string, any>) {
    const formData = new FormData()
    for (const name in data) {
      formData.append(name, data[name])
    }
    fetchPolyfill(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })
  }

  postUrl() {
    const form = this.form || document.getElementsByTagName('form')[0]
    if (form?.action) {
      return form.action
    }
    return undefined
  }
}
