import { HtmlForm } from './HtmlForm'

export class MarketoForm extends HtmlForm {
  marketoForm: any
  marketoButton: any
  marketoButtonTitle: any
  addSubmitHandler() {
    this.instrumentMarketoForm(this.formId)
  }

  instrumentMarketoForm(marketoFormId: string | number) {
    const form = window.MktoForms2?.getForm(marketoFormId) || window.MktoForms2?.allForms()[0]
    if (form?.getId()) {
      this.marketoForm = form
      this.marketoButton = this.marketoForm.getFormElem().find('.mktoButton')
      this.marketoButtonTitle = this.marketoButton.html()
      form.onSuccess((data: any) => {
        this.showCalendar(data)
        return false
      })
    } else {
      setTimeout(() => this.instrumentMarketoForm(marketoFormId), 500)
    }
  }

  get formOptions() {
    return {
      by: this.options.by,
      formIds: this.options.formIds,
      formId: this.options.formId,
      debug: this.options.debug === true,
      domain: this.options.domain,
      router: this.options.router,
      locale: this.options.locale,
      accountId: this.options.accountId,
      type: this.options.type,
      trigger: this.options.trigger || 'ThirdPartyForm',
      ownerId: this.options.ownerId,
      disableRelation: this.options.disableRelation,
    }
  }

  onClose(hasBooked: boolean) {
    super.onClose(hasBooked)
    this.marketoForm.submittable(true)
    this.marketoButton.removeAttr('disabled').html(this.marketoButtonTitle)
  }
}
