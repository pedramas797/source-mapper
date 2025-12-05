import { PopUp } from './PopUp'
import { Options } from './types'
import { log } from './logger'
import { dispatchEnrichDataEvent } from './utils'

export class PrelaunchApi {
  form?: HTMLFormElement
  routingId?: string
  emailField?: HTMLInputElement | null
  fieldNamesToEnrich?: string[]
  emailFieldName?: string
  enrichmentParentSelector?: string
  fieldElementsToEnrich?: NodeListOf<HTMLElement>
  CPPopUp?: PopUp
  options?: Options
  constructor(form?: HTMLFormElement, CPPopUp?: PopUp, options?: Options) {
    this.setForm(form)
    this.setCPPopUp(CPPopUp)
    this.addPrelaunchListeners()
    this.options = options
  }

  setCPPopUp = (CPPopUp?: PopUp) => {
    this.CPPopUp = CPPopUp
  }

  setForm = (form?: HTMLFormElement) => {
    this.form = form
    this.controlEmailField()
    this.hideEnrichmentFields()
  }

  initPrelaunch = ({
    fieldsToEnrich = [],
    emailField,
  }: {
    fieldsToEnrich: string[]
    emailField?: string
  }) => {
    this.emailFieldName = emailField
    this.fieldNamesToEnrich = fieldsToEnrich
    this.controlEmailField()
    this.hideEnrichmentFields()
  }

  controlEmailField = () => {
    if (this.emailFieldName && this.form) {
      this.emailField = this.form.querySelector<HTMLInputElement>(
        `input[name="${this.emailFieldName}"]`
      )
      if (this.emailField) {
        log(
          `Email field found: ${this.emailField.name}, adding blur listener to dispatch enrich data event`
        )
        const onEmailBlur = () => {
          dispatchEnrichDataEvent(this.emailField?.value)
        }
        this.emailField.onblur = onEmailBlur
      } else {
        log(`Email field with name ${this.emailFieldName} not found`)
      }
    } else {
      log('No email field name or form found')
    }
  }

  // Here we will find the input and label elements to hide
  // And send to booking app the email value once it gets blurred
  hideEnrichmentFields = () => {
    if (this.form && this.fieldNamesToEnrich?.length) {
      const fieldsToEnrichSelector = this.fieldNamesToEnrich.reduce((acc, fieldId) => {
        return `${acc ? `${acc}, ` : ''}label[for*="${fieldId}"], input[id="${fieldId}"], input[name="${fieldId}"], select[id="${fieldId}"], select[name="${fieldId}"]`
      }, '')
      log('Selector to find fields to enrich: ', fieldsToEnrichSelector)
      this.fieldElementsToEnrich = this.form.querySelectorAll<HTMLElement>(fieldsToEnrichSelector)
      this.fieldElementsToEnrich?.forEach(field => {
        if (this.enrichmentParentSelector) {
          log('Enrichment parent selector: ', this.enrichmentParentSelector)
          const div = field.closest<HTMLDivElement>(this.enrichmentParentSelector)
          if (div) {
            log('Hiding enrichment parent element: ', div)
            div.style.display = 'none'
          }
        }
        log('Hiding field: ', field)
        field.style.display = 'none'
        if ('value' in field) {
          field.value = ''
        }
      })
    } else {
      log('Form not found or no fields to enrich are set')
    }
  }

  // When the enrichment API is called with the email value
  // This function properly shows back or keeps fields hidden
  onEnrichData = ({
    enrichedFields,
    routingId,
  }: {
    enrichedFields: Record<string, string>
    routingId?: string
  }) => {
    log('Enriching data: ', enrichedFields)
    this.routingId = routingId
    this.fieldElementsToEnrich?.forEach(field => {
      const fieldValue = (() => {
        if ('name' in field && typeof field.name === 'string') {
          return enrichedFields[field.name]
        }
        // We should show bakc labels too
        if (field.hasAttribute('for')) {
          const fieldId = Object.keys(enrichedFields).find(fieldId =>
            field.getAttribute('for')?.includes(fieldId)
          )
          return fieldId ? enrichedFields[fieldId] : undefined
        }
        return enrichedFields[field.id]
      })()
      // Adds the value to the field so third party validations work
      if ('value' in field) {
        field.value = fieldValue || ''
        field.setAttribute('data-enriched', 'true')
      }

      if (field.hasAttribute('required')) {
        field.setAttribute('data-required', 'true')
        field.removeAttribute('required')
      }

      // If we couldn't enrich the data, we show it back
      if (!fieldValue) {
        if (this.enrichmentParentSelector) {
          const div = field.closest<HTMLDivElement>(this.enrichmentParentSelector)
          if (div) {
            div.style.display = ''
          }
        }
        field.style.display = ''

        // If the field is required, we need to put it back as required
        if (field.hasAttribute('data-required')) {
          field.setAttribute('required', 'true')
          field.removeAttribute('data-required')
        }

        if (field.hasAttribute('data-enriched')) {
          field.removeAttribute('data-enriched')
        }
      } else {
        if (this.enrichmentParentSelector) {
          const div = field.closest<HTMLDivElement>(this.enrichmentParentSelector)
          if (div) {
            div.style.display = 'none'
          }
        }
        field.style.display = 'none'

        // If the field is required, we need to remove required as it was enriched and no value is there
        if (field.hasAttribute('required')) {
          field.setAttribute('data-required', 'true')
          field.removeAttribute('required')
        }
      }
    })
  }

  onMessage = (event: MessageEvent) => {
    if (event.data.action === 'init-prelaunch') {
      this.initPrelaunch(event.data.args)
      this.options?.onLoadRouter?.(event.data.args.fieldsToEnrich)
    } else if (event.data.action === 'prelaunch-succeeded') {
      this.onEnrichData(event.data.args)
      this.options?.onEnrichData?.(event.data.args)
    }
  }

  addPrelaunchListeners = () => {
    window.addEventListener('message', this.onMessage, false)
  }

  removeEventListeners = () => {
    window.removeEventListener('message', this.onMessage)
  }
}
