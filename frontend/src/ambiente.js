import { reactive } from 'vue'

// Recuperiamo l'aspetto salvato dal disco (se esiste)
const skinSalvata = localStorage.getItem('skin_campo_minato')
  ? JSON.parse(localStorage.getItem('skin_campo_minato'))
  : null

export const skin = reactive({
  temaPrincipale: skinSalvata?.tema || '#42b9af',
  sfondoURL: skinSalvata?.sfondo || "url('/pattern/sfondo_base.jpg')",
  icona: skinSalvata?.icona || '🎭',

  // Funzione interna per scrivere sul disco rigido
  salvaSuDisco() {
    localStorage.setItem(
      'skin_campo_minato',
      JSON.stringify({
        tema: this.temaPrincipale,
        sfondo: this.sfondoURL,
        icona: this.icona,
      }),
    )
  },

  cambiaTema(tema) {
    this.temaPrincipale = tema
    this.salvaSuDisco() // Salviamo al volo
  },

  cambiaSfondo(sfondo) {
    this.sfondoURL = sfondo
    this.salvaSuDisco()
  },

  cambiaIcona(icona) {
    this.icona = icona
    this.salvaSuDisco()
  },
})

// Funzione di supporto per leggere il LocalStorage all'avvio
const utenteSalvato = localStorage.getItem('utente_campo_minato')
  ? JSON.parse(localStorage.getItem('utente_campo_minato'))
  : null

export const sessione = reactive({
  // Inizializza con i dati del disco (se ci sono) invece che sempre con null
  utente: utenteSalvato,

  setUtente(dati) {
    if (dati && dati.id && !dati.id_utente) {
      dati.id_utente = dati.id
    }
    this.utente = dati
    // Salva nel disco rigido del browser
    localStorage.setItem('utente_campo_minato', JSON.stringify(dati))
  },

  logout() {
    this.utente = null
    // Cancella dal disco rigido
    localStorage.removeItem('utente_campo_minato')
    localStorage.removeItem('token_campo_minato')
  },
})

export const notifica = reactive({
  messaggio: '',
  visibile: false,

  mostra(msg) {
    this.messaggio = msg
    this.visibile = true
  },

  chiudi() {
    this.visibile = false
    this.messaggio = ''
  },
})

// Popup per gli obiettivi
export const toast = reactive({
  titolo: '',
  descrizione: '',
  visibile: false,
  timeout: null,

  mostra(tit, desc) {
    this.titolo = tit
    this.descrizione = desc
    this.visibile = true

    // Se c'era già un toast, resettiamo il timer
    if (this.timeout) clearTimeout(this.timeout)

    // Scompare da solo dopo 5 secondi
    this.timeout = setTimeout(() => {
      this.chiudi()
    }, 5000)
  },

  chiudi() {
    this.visibile = false
  },
})

// Gestore audio
export const sfx = reactive({
  attivo: true, // Utile per creare un tasto "Muta" nelle impostazioni in futuro
  volumeGenerale: 0.5,

  play(nomeSuono) {
    if (!this.attivo) return

    // Istanziamento rapido: permette a più suoni uguali di sovrapporsi se clicchi veloce
    const audio = new Audio(`/audio/${nomeSuono}`)
    audio.volume = this.volumeGenerale

    // Il catch intercetta l'errore che i browser danno se provi a far partire
    // un audio prima che l'utente abbia interagito con la pagina
    audio.play().catch((err) => console.warn('Riproduzione audio bloccata dal browser', err))
  },
})
