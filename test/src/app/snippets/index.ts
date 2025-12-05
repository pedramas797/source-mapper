import { bookMeeting } from '../concierge'
import { Optional, Options } from '../types'
import { executeWhenFormLoads } from '../utils'
import { deployGravityFormsOnFormPage, deployGravityFormsOnThankYouPage } from './gravityForms'
import { deployHubspotIframe, deployHubspotPopup } from './hubspot'
import { deployMarketo } from './marketo'
import { deployTypeform } from './typeform'
import {
  deployPardotFormHandlerOnThankYouPage,
  deployPardotIframeOnParentPage,
  deployPardotIframeOnThankYouPage,
  deployPardotOnLookAndFeel,
} from './pardot'
import { deployInstaPage } from './instapage'
import { deployMadkudu } from './madkudu'

export const deployRouter = (
  options: Optional<Options, 'form'>,
  forms?: NodeListOf<HTMLFormElement>
) => {
  switch (options.formType) {
    case 'Hubspot':
      deployHubspotIframe(options, forms)
      break
    case 'HubspotPopup':
      deployHubspotPopup(options)
      break
    case 'PardotFormHandler':
      deployPardotFormHandlerOnThankYouPage(options)
      break
    case 'PardotIframeThankYouCode':
      deployPardotIframeOnThankYouPage()
      break
    case 'PardotIframeParentPage':
      deployPardotIframeOnParentPage(options)
      break
    case 'PardotFormHandlerThankYouCode':
      deployPardotIframeOnParentPage(options)
      deployPardotIframeOnThankYouPage()
      break
    case 'PardotLookAndFeel':
      deployPardotOnLookAndFeel(options)
      break
    case 'Marketo':
      deployMarketo(options)
      break
    case 'GravityForms':
      deployGravityFormsOnThankYouPage(options)
      break
    case 'GravityFormsOnFormPage':
      deployGravityFormsOnFormPage(options)
      break
    case 'Typeform':
      deployTypeform(options)
      break
    case 'Instapage':
      deployInstaPage(options)
      break
    case 'Madkudu':
      deployMadkudu(options)
      break
    default:
      // Defaults to ChiliPiper.scheduling
      executeWhenFormLoads(bookMeeting)(options)
      break
  }
}
