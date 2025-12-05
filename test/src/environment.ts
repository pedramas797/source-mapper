const documentCurrentScript = document.currentScript as
  | (HTMLOrSVGScriptElement & { src: string })
  | undefined

const currentScriptUrl = documentCurrentScript?.src || import.meta.url

const domain = (() => {
  if (process.env.NODE_ENV === 'development' || !currentScriptUrl) {
    return 'chilipiper.io'
  }

  const url = new URL(currentScriptUrl)
  const hostname = url.hostname
  const parts = hostname.split('.')

  const result = parts.length > 2 ? parts.slice(-2).join('.') : hostname

  // prevent breaking prod customers doing weird stuff when loading concierge
  // e.g. bundling conciergejs into their code with tools like https://nitropack.io/
  if (!result.startsWith('chilipiper.')) {
    console.warn(
      'Could not find CP domain in snippet URL. Be aware that this warning means snippet is loaded from a different domain and may not work as expected.'
    )

    return 'chilipiper.com'
  }

  return result
})()

export const environment = {
  domain,
}
