const API_URL = import.meta.env.VITE_SOCKET_URL

export const apiFetch = async (endpoint, opzioni = {}) => {
  const token = localStorage.getItem('token_campo_minato')

  // Prepariamo gli header automatici
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...opzioni.headers,
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...opzioni,
    headers,
  })

  const dati = await response.json()

  if (!response.ok) {
    throw new Error(dati.error || dati.message || 'Errore nella richiesta al server')
  }

  return dati
}
