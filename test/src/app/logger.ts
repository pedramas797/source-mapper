/* eslint-disable no-console */
export const log = (...args: Parameters<typeof console.log>) => {
  console.group('[ChiliPiper] Log')
  console.log(...args)
  console.groupEnd()
}

export const error = (...args: Parameters<typeof console.error>) => {
  console.group('[ChiliPiper] Error')
  console.error(...args)
  console.groupEnd()
}

export const debug = (...args: Parameters<typeof console.debug>) => {
  if (window.ChiliPiper?._marketingApi?.options?.debug) {
    console.group('[ChiliPiper] Debug')
    console.debug(...args)
    console.groupEnd()
  }
}
