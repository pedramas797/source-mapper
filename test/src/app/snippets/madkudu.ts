import { MarketingApi } from '../MarketingApi'
import { submitAndRoute } from '../concierge'
import { Optional, Options } from '../types'

export const deployMadkudu = (options: Optional<Options, 'form'>) => {
  const marketingApi = new MarketingApi(options)
  if (window.form && window.madkudu && 'show_modal' in window.form) {
    const makduduForm = window.form
    const traits = window.madkudu.user().traits()
    const firstName = traits.first_name || 'Howdy'
    let successState = false

    const chiliOptions = {
      lead: {
        ...traits,
        FirstName: traits.first_name || '',
        LastName: traits.last_name || ' ',
        Email: traits.email,
        Company: traits.company?.name || '',
      },
      onSuccess: () => {
        successState = true
        makduduForm.dismiss_modal()
      },
      onClose: () => {
        if (successState) {
          window.location.href = 'http://www.madkudu.com'
        }
      },
    }

    const modalOptions = {
      title: `${firstName}, you qualify for the fast lane!`,
      subtitle: 'Our scoring tells us you should get access to our calendar now.',
      cta_yes: 'Book time with us',
      cta_no: 'No thanks.',
    }

    makduduForm.show_modal(modalOptions)

    setTimeout(() => {
      // Listen on accept button to show the Calendly widget
      document.querySelectorAll('.madkudu_modal__accept').forEach(button => {
        button.addEventListener('click', () => {
          submitAndRoute(
            {
              ...options,
              lead: {
                ...options.lead,
                ...chiliOptions.lead,
              },
            },
            marketingApi
          )
        })
      })
    }, 300)
  }
}
