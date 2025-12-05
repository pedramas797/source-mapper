// Make text more readable
export const camelText = (str: string) => {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match) {
    if (+match === 0) {
      return ''
    }
    return match.toUpperCase()
  })
}

// Strip characters and spaces
export const stripText = (text = '') => {
  return camelText(text).replace(/[^\w]/gi, '')
}

// Get custom class name for pardot
export const parseClassNames = (className: string = '') => {
  return className.split(' ').find(value => value.toLocaleLowerCase().indexOf('cp_') === 0)
}
