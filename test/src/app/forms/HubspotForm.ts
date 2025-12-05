import { fetch as fetchPolyfill } from 'whatwg-fetch'
import { MarketingApi } from '../MarketingApi'
import { Options } from '../types'

export class HubspotForm extends MarketingApi {
  hubspotForm?: HTMLFormElement
  actionUrl?: string
  constructor(options: Options) {
    super(options)
    this.addSubmitHandler()
  }

  addSubmitHandler() {
    this.form?.addEventListener('submit', event => {
      this.storeData(event)
      this.handleSubmit(event)
      this.postUrl()
    })
  }

  storeData(event: Event) {
    this.hubspotForm = event.target as HTMLFormElement
    const data = this.formData
    window.localStorage.setItem('hubspotData', JSON.stringify(data))
  }

  handleSubmit(event: Event) {
    if ((event.target as HTMLElement).id.includes('hsForm')) {
      this.hubspotForm = event.target as HTMLFormElement
      if (
        this.hubspotForm.checkValidity() &&
        document.getElementsByClassName('hs_email')[0].childElementCount < 4
      ) {
        this.showCalendar(this.formData)
      }
    }
  }

  get formData() {
    return this.reduceForm(this.hubspotForm as HTMLFormElement)
  }

  sendData(url: string, data: Record<string, any>, success: boolean) {
    const formData = new FormData()
    for (const name in data) {
      formData.append(name, data[name])
    }
    formData.set('meeting_booked_cp', String(success))
    fetchPolyfill(url, {
      method: 'POST',
      body: formData,
      mode: 'no-cors',
      credentials: 'include',
    })
  }

  postUrl() {
    const form = this.form || document.getElementsByTagName('form')[0]
    if (form?.action) {
      this.actionUrl = form.action
    }
  }

  onSuccess() {
    const data = this.formData
    const url = this.actionUrl
    if (data.meeting_booked_cp && url) {
      this.sendData(url, data, true)
    }
  }

  onClose() {}
}
