import { describe, it, expect } from 'vitest'
import { getApiErrorMessage } from '../api'

describe('getApiErrorMessage', () => {
  it('uses API message when present', () => {
    const err = { response: { data: { message: ' Title is required ' } } }
    expect(getApiErrorMessage(err)).toBe('Title is required')
  })

  it('flattens ASP.NET ModelState errors', () => {
    const err = { response: { data: { errors: { Title: ['Too long', 'Required'] } } } }
    expect(getApiErrorMessage(err)).toBe('Too long Required')
  })

  it('uses fallback for client-side errors without response', () => {
    expect(getApiErrorMessage(new Error('map is not a function'))).toBe(
      'Something went wrong. Please try again.'
    )
  })
})
