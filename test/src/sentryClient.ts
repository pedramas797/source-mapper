import {
  BrowserClient,
  defaultStackParser,
  getDefaultIntegrations,
  makeFetchTransport,
  Scope,
} from '@sentry/browser'
import { environment } from './environment'

// prevent concierge sentry to conflict with sentry on hosted website.
// we should export things like captureException from this client instead of using the one
// from sentry directly.
export const client = new BrowserClient({
  dsn: 'https://5acd77a479f023b04380ea323d3b0764@o94797.ingest.us.sentry.io/4508245583921152',
  tunnel: `${process.env.REACT_APP_TRACK_RESOURCE}/sentry/tunnel`,
  release: process.env.SENTRY_RELEASE_COMMIT,
  environment: environment.domain,
  // remove integrations that use global sentry object https://docs.sentry.io/platforms/javascript/best-practices/multiple-sentry-instances/
  integrations: getDefaultIntegrations({}).filter(defaultIntegration => {
    return !['BrowserApiErrors', 'Breadcrumbs', 'GlobalHandlers'].includes(defaultIntegration.name)
  }),
  transport: makeFetchTransport,
  stackParser: defaultStackParser,
  beforeSend(event) {
    const eventFrames = event.exception?.values?.flatMap(
      exception => exception.stacktrace?.frames ?? []
    )

    // ignore root-level errors are they are not related to snippet
    if (!eventFrames?.length) {
      return null
    }

    // ignores anything that is not happening in our code
    if (
      !eventFrames.every(
        eventFrame =>
          eventFrame.filename?.includes('/concierge-js/cjs/concierge.js') ||
          eventFrame.filename?.includes('/concierge-js/concierge.js')
      )
    ) {
      return null
    }

    // eslint-disable-next-line no-console
    console.log(event)
    return event
  },
})

const scope = new Scope()
scope.setClient(client)
client.init()

// just so its exported even if captureException is not called.
// client.init() needs to be called right after setClient otherwise it doesnt work
// eslint-disable-next-line @typescript-eslint/no-empty-function
export const initSentryClient = () => {}
export const captureException = scope.captureException.bind(scope)
