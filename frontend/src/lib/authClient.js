/**
 * Sessão — app de usuário único, login por senha (sem cadastro/e-mail).
 */

import { apiUrl } from './api'

const TOKEN_KEY = 'facilita-oab-token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function isAuthenticated() {
  return !!getToken()
}

export async function login(password) {
  const res = await fetch(apiUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Senha incorreta.')
  }
  const { token } = await res.json()
  localStorage.setItem(TOKEN_KEY, token)
  window.dispatchEvent(new CustomEvent('auth:changed'))
  return token
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  window.dispatchEvent(new CustomEvent('auth:changed'))
}

export function subscribeAuth(cb) {
  const handler = () => cb()
  window.addEventListener('auth:changed', handler)
  window.addEventListener('auth:expired', handler)
  return () => {
    window.removeEventListener('auth:changed', handler)
    window.removeEventListener('auth:expired', handler)
  }
}
