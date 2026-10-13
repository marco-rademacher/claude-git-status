import { expect, test } from 'claude-code/testing'

import { aheadRange, checkoutPaths, expandHome, readCheckout, repoName, settingsFrom, statusLine } from './line'

const FRONT = ' │  '

test('settings: defaults, a single path, wrong types count as unset', () => {
  expect(settingsFrom({})).toEqual({ branch: '', nestedRepos: false, extraRepos: [] })
  expect(settingsFrom({ branch: ' develop ', nestedRepos: true, extraRepos: ['~/shared', ''] }))
    .toEqual({ branch: 'develop', nestedRepos: true, extraRepos: ['~/shared'] })
  expect(settingsFrom({ extraRepos: '~/shared' }).extraRepos).toEqual(['~/shared'])
  expect(settingsFrom({ branch: 3, nestedRepos: 'yes' })).toEqual({ branch: '', nestedRepos: false, extraRepos: [] })
})

test('paths: home, order, each once', () => {
  expect(expandHome('~/Projects/shared/', '/Users/a')).toBe('/Users/a/Projects/shared')
  expect(expandHome('~', '/Users/a')).toBe('/Users/a')
  expect(expandHome('/opt/repo', '/Users/a')).toBe('/opt/repo')
  expect(expandHome('~/x', undefined)).toBe('~/x')
  expect(checkoutPaths('/p/app', ['/p/app/ios'], ['/p/shared', '/p/app'])).toEqual(['/p/app', '/p/app/ios', '/p/shared'])
  expect(checkoutPaths(null, [], ['/p/shared'])).toEqual(['/p/shared'])
  expect(repoName('/p/app/ios/')).toBe('ios')
})

test('range: current branch against its upstream, or the configured branch', () => {
  expect(aheadRange('')).toBe('@{u}..HEAD')
  expect(aheadRange('develop')).toBe('develop@{u}..develop')
})

test('checkout: ahead and changed, null without either', () => {
  expect(readCheckout('ios', '4\n', '')).toEqual({ name: 'ios', ahead: 4, changed: 0 })
  expect(readCheckout('ios', '0\n', ' M a.swift\n?? b.swift\n')).toEqual({ name: 'ios', ahead: 0, changed: 2 })
  expect(readCheckout('ios', '0\n', '')).toBe(null)
  expect(readCheckout('ios', '', '')).toBe(null)
})

test('line: always there, changes first', () => {
  expect(statusLine([])).toBe(`${FRONT}up to date`)
  expect(statusLine([{ name: 'ios', ahead: 4, changed: 0 }, { name: 'shared', ahead: 1, changed: 0 }]))
    .toBe(`${FRONT}unpushed: ios ↑4 · shared ↑1`)
  expect(statusLine([{ name: 'ios', ahead: 0, changed: 3 }])).toBe(`${FRONT}ios: 3 changed`)
  expect(statusLine([{ name: 'ios', ahead: 0, changed: 3 }, { name: 'shared', ahead: 2, changed: 0 }]))
    .toBe(`${FRONT}ios: 3 changed · shared ↑2`)
})
