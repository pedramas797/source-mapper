import { getQuery } from '../concierge'
import { Optional, Options } from '../types'

const defaultQueryVariable = 'Email'

export const deployTypeform = (options: Optional<Options, 'form'>) => {
  getQuery({
    ...options,
    queryVariable: options.queryVariable ?? defaultQueryVariable,
  })
}
