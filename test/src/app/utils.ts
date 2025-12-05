import { Optional, Options } from './types'
import { debug, log } from './logger'

export const dispatchEnrichDataEvent = (email?: string) => {
  if (!email) {
    log('No email value provided, skipping enrich data process')
    return
  }
  if (!window.ChiliPiper?._marketingApi?.popup?.isListeningForDataUpdates) {
    log(
      'Chili Piper form not loaded yet, skipping enrich data process. Please ensure the form is loaded before calling ChiliPiper.enrich().'
    )
    return
  }
  log('Dispatching enrich data event for email: ', email)
  const eventData = { type: 'PERFORM_PRELAUNCH', data: email }
  if (window.ChiliPiper?._marketingApi?.popup?.iframe) {
    window.ChiliPiper?._marketingApi?.popup?.iframe.contentWindow?.postMessage(eventData, '*')
  } else if (window.self !== window.top) {
    window.top?.postMessage(eventData, '*')
  }
}

export function waitUntilElementExists(
  selector: string,
  callback: (elements: NodeListOf<HTMLFormElement>) => any,
  bypass = false
) {
  const el = document.querySelectorAll<HTMLFormElement>(selector)
  if (el.length) {
    debug('form found: ', selector)
    return callback(el)
  } else if (bypass) {
    return callback(el)
  }

  setTimeout(() => {
    waitUntilElementExists(selector, callback)
  }, 500)
}

export function findForms(options: Optional<Options, 'form'>) {
  if (options.query) {
    return options.query
  }

  if (options.formIds) {
    return options.formIds.map(id => `#${id}`).join(',')
  }

  if (options.formId) {
    return `#${options.formId}`
  }
  return 'form'
}

export const executeWhenDOMContentLoaded = (handler: () => void) => {
  window.addEventListener('DOMContentLoaded', () => {
    handler()
  })
}

export const executeWhenFormLoads = (
  handler: (options: Optional<Options, 'form'>, forms: NodeListOf<HTMLFormElement>) => void
) => {
  return (options: Optional<Options, 'form'>) => {
    return waitUntilElementExists(
      findForms(options),
      forms => handler({ ...options, shouldCheck: true }, forms),
      !!options.lead || !!options.form
    )
  }
}

// Throttle function in order to prevent multiple calls to the function and not need to install lodash
export const throttle = (func: (...args: any[]) => void, limit = 1000) => {
  let inThrottle: boolean
  return (...args: any[]) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
