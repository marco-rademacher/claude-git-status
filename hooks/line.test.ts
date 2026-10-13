import { expect, test } from 'claude-code/testing'

import { aheadRange, checkoutPaths, expandHome, readCheckout, repoName, settingsFrom, shortBranch, statusLine } from './line'
import type { Checkout } from './line'

const FRONT = '\u00a0│\u00a0\u00a0'

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

test('checkout: branch, ahead, merges and changed from the git output', () => {
  expect(readCheckout('ios', { branch: 'develop\n', ahead: '4\n', merges: '2\n', status: ' M a.swift\n?? b.swift\n' }))
    .toEqual({ name: 'ios', branch: 'develop', ahead: 4, merges: 2, changed: 2 })
  expect(readCheckout('ios', { branch: '', ahead: '', merges: 'fatal: no upstream', status: '' }))
    .toEqual({ name: 'ios', branch: null, ahead: 0, merges: 0, changed: 0 })
})

const c = (name: string, branch: string | null, ahead = 0, merges = 0, changed = 0): Checkout =>
  ({ name, branch, ahead, merges, changed })

test('line: always there, with branches, changes first, merges counted', () => {
  expect(statusLine([c('app', 'develop')])).toBe(`${FRONT}up to date · develop`)
  expect(statusLine([c('app', null)])).toBe(`${FRONT}up to date`)
  expect(statusLine([])).toBe(`${FRONT}up to date`)
  expect(statusLine([c('ios', 'develop', 4, 2), c('shared', 'main', 1)]))
    .toBe(`${FRONT}unpushed: ios develop ↑4 (2 merges) · shared main ↑1`)
  expect(statusLine([c('ios', 'develop', 1, 1)])).toBe(`${FRONT}unpushed: ios develop ↑1 (1 merge)`)
  expect(statusLine([c('ios-2', 'chore/uhr-bonjour-hinweis', 0, 0, 1), c('shared', 'develop', 4, 2)]))
    .toBe(`${FRONT}ios-2 chore/uhr-bonjour-hinwe…: 1 changed · shared develop ↑4 (2 merges)`)
})

test('line: a set branch names the counted branch, not the checked-out one', () => {
  expect(statusLine([c('ios-2', 'feature/x', 3, 1)], 'develop')).toBe(`${FRONT}unpushed: ios-2 develop ↑3 (1 merge)`)
  expect(statusLine([c('ios-2', 'feature/x', 0, 0, 2)], 'develop')).toBe(`${FRONT}ios-2 feature/x: 2 changed`)
})

test('branch: cut past 24 characters', () => {
  expect(shortBranch('develop')).toBe('develop')
  expect(shortBranch('chore/uhr-bonjour-hinweis')).toBe('chore/uhr-bonjour-hinwe…')
  expect(shortBranch('x'.repeat(24))).toBe('x'.repeat(24))
})
