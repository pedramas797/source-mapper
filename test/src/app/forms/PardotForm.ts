import { MarketingApi } from '../MarketingApi'
import { Options } from '../types'

export class PardotForm extends MarketingApi {
  constructor(options: Options) {
    super(options)
    this.addSubmitHandler()
  }

  addSubmitHandler() {
    this.form?.addEventListener('submit', () => this.handleSubmit())
  }

  handleSubmit() {
    const data = this.formData
    data.sender = 'form'
    window.localStorage.setItem('dataPardot', JSON.stringify(data))
  }

  get formData() {
    return this.reduceForm(this.form)
  }
}
