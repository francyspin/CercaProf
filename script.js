let orario = null;
let docentiSet = new Set(), aulaSet = new Set(), classiSet = new Set();
let currentPage = 1;
const resultsPerPage = 5; // Puoi aumentare questo se vuoi, es. 10

window.vaiPagina = function(page) {
  currentPage = page;
  cerca();
};

/* --- LOGICA DI BANNER E FRASI CENTRALI (INVARIATA) --- */
function mostraBannerBenvenuto() {
  document.getElementById('banner-benvenuto').innerHTML = `<span>🎓 Benvenuto! </span>`;
}

const frasi = [
  "Seleziona i filtri sopra per cercare nell'orario scolastico.",
  "Premi <b>Cerca adesso</b> per vedere le lezioni attive.",
  "Nella sezione docenti puoi scoprire tutte le ore disponibili.",
  "Filtra per <b>aula</b> e trova laboratori liberi!",
  function () {
    const d = new Date();
    let oraScuola = oraCorrenteScuola();
    if (oraScuola && oraScuola !== "" && oraScuola !== null && typeof oraScuola !== 'undefined') {
      return `Oggi è ${d.toLocaleDateString()}, ora scolastica attuale: <b>${oraScuola}ª ora</b>`;
    } else {
      return `Oggi è ${d.toLocaleDateString()}, <b>nessuna ora scolastica in corso</b>`;
    }
  }
];

function ciclaBannerFrasi() {
  const box = document.getElementById('banner-frasi');
  let idx = 0;
  box.innerHTML = `<div class="frase-ciclica">${typeof frasi[idx] === "function" ? frasi[idx]() : frasi[idx]}</div>`;
  if(box.dataset.cicla) return; // previene doppio timer
  box.dataset.cicla = "1";
  setInterval(() => {
    idx = (idx + 1) % frasi.length;
    box.querySelector(".frase-ciclica").style.opacity = 0;
    setTimeout(() => {
      const frase = typeof frasi[idx] === "function" ? frasi[idx]() : frasi[idx];
      box.querySelector(".frase-ciclica").innerHTML = frase;
      box.querySelector(".frase-ciclica").style.opacity = 1;
    }, 400);
  }, 3400);
}

function mostraHome() {
  document.getElementById('banner-benvenuto').style.display = "";
  document.getElementById('banner-frasi').style.display = "";
  mostraBannerBenvenuto();
  ciclaBannerFrasi();
  document.getElementById('risultati').style.display = "none";
  document.body.classList.remove('senza-lezioni');
  // Resetta i filtri quando torni alla home
  document.getElementById('classe_select').value = "";
  document.getElementById('docente_select').value = "";
  document.getElementById('aula_select').value = "";
  document.getElementById('giorno_select').value = "";
  document.getElementById('ora_select').value = "";
}

/* --- DATI DI ORARIO (INVARIATO) --- */
const orari_scuola = {
  "Lun": ["08:00-09:00","09:00-10:00","10:00-11:00","11:00-12:00","12:00-13:00","13:00-14:00","13:20-14:10"],
  "Ven": ["08:00-09:00","09:00-10:00","10:00-11:00","11:00-12:00","12:00-13:00","13:00-14:00","13:20-14:10"],
  "Mar": ["08:00-08:50","08:50-09:45","09:45-10:40","10:40-11:35","11:35-12:30","12:30-13:20","13:20-14:10"],
  "Mer": ["08:00-08:50","08:50-09:45","09:45-10:40","10:40-11:35","11:35-12:30","12:30-13:20","13:20-14:10"],
  "Gio": ["08:00-08:50","08:50-09:45","09:45-10:40","10:40-11:35","11:35-12:30","12:30-13:20","13:20-14:10"],
};

fetch('orario_unificato.json')
  .then(resp => resp.json())
  .then(data => {
    orario = data;
    data.forEach(item => {
      classiSet.add(item.Classe);
      let matchDoc = item.Descrizione.match(/\b([A-Z][a-z]+(?: [Dd]e| [Dd]i| [Dd]a| [Dd]el| [Dd]ella)?(?: [A-Z][a-z]+)? [A-Z]\.?)(?=\)|;|,|$)/g);
      if(matchDoc) matchDoc.forEach(nome => docentiSet.add(nome));
      let matchAula = item.Descrizione.match(/(\bLab\..+|\bAula.+|\bPalestre\b.+|\b[0-9]{3}|\b[ABC][0-9]{2,3}|[A-Z]+\s?\d{1,3})$/i);
      if(matchAula) aulaSet.add(matchAula[0].trim());
    });
    aggiornaSelect(document.getElementById('classe_select'), classiSet);
    aggiornaSelect(document.getElementById('docente_select'), docentiSet);
    aggiornaSelect(document.getElementById('aula_select'), aulaSet);

    // Listener solo dopo il popolamento!
    ['classe_select','docente_select','aula_select','giorno_select','ora_select'].forEach(id => {
      document.getElementById(id).addEventListener('change', function() {
        currentPage = 1; // reset pagina se cambio filtri!
        cerca();
      });
    });
  });

function aggiornaSelect(sel, values) {
  Array.from(values).sort().forEach(val => {
    let op = document.createElement("option");
    op.value = val;
    op.textContent = val;
    sel.appendChild(op);
  });
}

/* --- FUNZIONI RICERCA CENTRALE (MODIFICATE) --- */
function cerca() {
  // All'inizio di cerca/cercaAdesso
  document.getElementById('banner-benvenuto').style.display = "none";
  document.getElementById('banner-frasi').style.display = "none";
  document.getElementById('risultati').style.display = "";
  document.body.classList.remove('senza-lezioni');

  const classe = document.getElementById('classe_select').value;
  const docente = document.getElementById('docente_select').value;
  const aula = document.getElementById('aula_select').value;
  const giorno = document.getElementById('giorno_select').value;
  const ora    = document.getElementById('ora_select').value;

  // Se NESSUN filtro è selezionato, torna alla home
  if (!classe && !docente && !aula && !giorno && !ora) {
    mostraHome();
    return;
  }

  let risultati = orario.filter(item => {
    let ok = true;
    if (classe)  ok = ok && item.Classe === classe;
    if (docente) ok = ok && item.Descrizione.includes(docente);
    if (aula)    ok = ok && item.Descrizione.includes(aula);
    if (giorno)  ok = ok && item.Giorno === giorno;
    if (ora)     ok = ok && item.Ora == ora;
    ok = ok && item.Descrizione && item.Descrizione !== "nan";
    return ok;
  });

  // Ordina i risultati per giorno e poi ora, per coerenza
  risultati.sort((a, b) => {
    const giorni = ["Lun", "Mar", "Mer", "Gio", "Ven"];
    if (a.Giorno !== b.Giorno) {
      return giorni.indexOf(a.Giorno) - giorni.indexOf(b.Giorno);
    }
    return Number(a.Ora) - Number(b.Ora);
  });
  
  // Chiama mostraRisultati. La paginazione avverrà LÌ.
  mostraRisultati(risultati);
}

function cercaAdesso() {
  // All'inizio di cerca/cercaAdesso
  document.getElementById('banner-benvenuto').style.display = "none";
  document.getElementById('banner-frasi').style.display = "none";
  document.getElementById('risultati').style.display = "";
  document.body.classList.remove('senza-lezioni');
  
  const giorni = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const oggi = new Date();
  const giorno = giorni[oggi.getDay()];
  const ora_scuola = oraCorrenteScuola();

  // Reset pagina a 1 per 'cercaAdesso'
  currentPage = 1; 

  // Prende i filtri opzionali
  const classe = document.getElementById('classe_select').value;
  const docente = document.getElementById('docente_select').value;
  const aula    = document.getElementById('aula_select').value;

  let risultati = [];
  if (ora_scuola) {
    risultati = orario.filter(item => {
      let ok = true;
      ok = ok && item.Giorno === giorno;
      ok = ok && item.Ora.toString() === ora_scuola.toString();
      ok = ok && item.Descrizione && item.Descrizione !== "nan";
      if (classe)  ok = ok && item.Classe === classe;
      if (docente) ok = ok && item.Descrizione.includes(docente);
      if (aula)    ok = ok && item.Descrizione.includes(aula);
      return ok;
    });
  }
  
  // Passa 'adessoMode = true' per mostrare il banner speciale se non ci sono lezioni
  mostraRisultati(risultati, ora_scuola, giorno, true);
}

function mostraRisultati(risultati, ora_scuola = null, giorno = null, adessoMode = false){
  document.body.classList.remove('senza-lezioni');
  const box = document.getElementById('risultati');
  let pagi = "";
  let table = "";

  // Banner "Non ci sono lezioni" (SOLO per 'cercaAdesso' e se non trova nulla)
  if(adessoMode && (!ora_scuola || ora_scuola === "" || typeof ora_scuola === "undefined" || risultati.length === 0)) {
    document.body.classList.add('senza-lezioni');
    // SOLO banner, nessuna tabella, nessun bottone
    box.innerHTML = `
      <div class="banner-lezioni">
        <div class="icona-banner">⚠️</div>
        <h2>Non ci sono lezioni attive al momento!</h2>
        <p>Le lezioni sono finite oppure non sono ancora iniziate.<br>
        Nessuna classe o docente risulta impegnato ora.</p>
      </div>
    `;
    return;
  }

  // --- LOGICA DI PAGINAZIONE CORRETTA ---
  
  // 1. Calcola il numero totale di pagine
  const totalPages = Math.ceil(risultati.length / resultsPerPage);

  // 2. Genera i pulsanti di paginazione (solo se c'è più di una pagina)
  if (totalPages > 1) {
    pagi = generaPaginazione(currentPage, totalPages);
  }

  // 3. "Taglia" l'array dei risultati per la pagina corrente
  const start = (currentPage - 1) * resultsPerPage;
  const end = start + resultsPerPage;
  const risultatiPagina = risultati.slice(start, end);

  // --- FINE LOGICA DI PAGINAZIONE ---


  if (risultatiPagina.length === 0 && risultati.length === 0) { // Controlla se NON ci sono risultati totali
    table = `<table class="orario-tabella">
      <thead>
        <tr>
          <th>Classe</th><th>Giorno</th><th>Ora</th><th>Docente</th><th>Aula</th><th>Descrizione</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="6" style="text-align:center; color:#e02538; font-size:1.16em"><em>Nessun risultato trovato.</em></td>
        </tr>
      </tbody>
    </table>`;
  } else {
    table = `<table class="orario-tabella">
      <thead>
        <tr>
          <th>Classe</th><th>Giorno</th><th>Ora</th><th>Docente</th><th>Aula</th><th>Descrizione</th>
        </tr>
      </thead>
      <tbody>
        ${risultatiPagina.map(item=>`
          <tr>
            <td>${item.Classe}</td>
            <td>${item.Giorno}</td>
            <td>${item.Ora}</td>
            <td>${(item.Descrizione.match(/\b([A-Z][a-z]+(?: [Dd]e| [Dd]i| [Dd]a| [Dd]el| [Dd]ella)?(?: [A-Z][a-z]+)? [A-Z]\.?)(?=\)|;|,|$)/g)||[''])[0]}</td>
            <td>${(item.Descrizione.match(/(\bLab\..+|\bAula.+|\bPalestre\b.+|\b[0-9]{3}|\b[ABC][0-9]{2,3}|[A-Z]+\s?\d{1,3})$/i)||[''])[0]}</td>
            <td>${item.Descrizione}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
  }
  
  // Aggiungi un contatore dei risultati
  let contatore = `<div class"contatore-risultati" style="text-align:left; margin-bottom:10px; font-weight:500; color:#0b4c8c;">
    Trovati ${risultati.length} risultati. ${totalPages > 1 ? `Pagina ${currentPage} di ${totalPages}.` : ''}
  </div>`;
  
  // Mostra prima il contatore (se ci sono filtri), poi la paginazione, poi la tabella
  box.innerHTML = `<div class="tabella-e-pagine">${contatore}${pagi}<div class="contenitore-tabella">${table}</div></div>`;
}


/* --- SCUOLA: ORA CORRENTE (INVARIATA) --- */
function oraCorrenteScuola() {
  const giorni = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const oggi = new Date();
  const giorno = giorni[oggi.getDay()];
  const ora = oggi.getHours(), min = oggi.getMinutes();
  let intervalli = orari_scuola[giorno];
  if(!intervalli) return "";
  for(let i=0; i<intervalli.length; i++) {
    let [start, end] = intervalli[i].split("-");
    let [sH, sM] = start.split(":").map(Number);
    let [eH, eM] = end.split(":").map(Number);
    let nowMinuti = ora * 60 + min;
    let sMinuti = sH * 60 + sM;
    let eMinuti = eH * 60 + eM;
    if(nowMinuti >= sMinuti && nowMinuti < eMinuti) return (i+1).toString();
  }
  return "";
}

/* --- AVVIO PAGINA: HOME BENVENUTO (INVARIATO) --- */
document.addEventListener('DOMContentLoaded', mostraHome);

/* --- PAGINAZIONE (INVARIATA - ORA FUNZIONA) --- */
function generaPaginazione(currentPage, totalPages) {
  const maxShown = 10;
  let start = Math.floor((currentPage-1) / maxShown) * maxShown + 1;
  let end = Math.min(start + maxShown - 1, totalPages);
  let pagi = `<div class="paginazione">`;

  // Freccia indietro, solo se blocco >1
  if (start > 1) {
    pagi += `<button class="btn-pagi" onclick="window.vaiPagina(${start-1})">&laquo;</button>`;
  }

  // Bottoni numerici
  for (let p = start; p <= end; p++) {
    pagi += `<button class="btn-pagi" onclick="window.vaiPagina(${p})"${p===currentPage?' style="font-weight:bold; background:#2186eb; color:#fff; border-color:#1976d2;"':''}>${p}</button>`;
  }

  // Freccia avanti, solo se blocco non è l'ultimo
  if (end < totalPages) {
    pagi += `<button class="btn-pagi" onclick="window.vaiPagina(${end+1})">&raquo;</button>`;
  }

  pagi += `</div>`;
  return pagi;
}
// Aggiungi questa funzione nel tuo script.js
// Si collega al nuovo pulsante "Annulla Filtri"

function resetFiltri() {
    currentPage = 1;
    mostraHome();
}

// MODIFICA: Fai in modo che i filtri cerchino automaticamente
// Sostituisci la parte 'Listener solo dopo il popolamento!'
// con questa:

fetch('orario_unificato.json')
  .then(resp => resp.json())
  .then(data => {
    orario = data;
    // ... (tutta la logica 'forEach' per popolare i Set) ...
    
    aggiornaSelect(document.getElementById('classe_select'), classiSet, "Filtra per Classe...");
    aggiornaSelect(document.getElementById('docente_select'), docentiSet, "Filtra per Docente...");
    aggiornaSelect(document.getElementById('aula_select'), aulaSet, "Filtra per Aula...");

    // Listener solo dopo il popolamento!
    ['classe_select','docente_select','aula_select','giorno_select','ora_select'].forEach(id => {
      document.getElementById(id).addEventListener('change', function() {
        currentPage = 1; // reset pagina se cambio filtri!
        cerca(); // CERCA SUBITO!
      });
    });
  });

// MODIFICA: Aggiorna 'aggiornaSelect' per accettare il testo placeholder
function aggiornaSelect(sel, values, placeholder) {
  // Aggiunge il placeholder come prima opzione
  sel.innerHTML = `<option value="">${placeholder}</option>`; 
  
  Array.from(values).sort().forEach(val => {
    let op = document.createElement("option");
    op.value = val;
    op.textContent = val;
    sel.appendChild(op);
  });
}

// MODIFICA: Aggiorna 'mostraHome' per resettare i placeholder
function mostraHome() {
  document.getElementById('banner-benvenuto').style.display = "";
  document.getElementById('banner-frasi').style.display = "";
  mostraBannerBenvenuto();
  ciclaBannerFrasi();
  document.getElementById('risultati').style.display = "none";
  document.body.classList.remove('senza-lezioni');
  
  // Resetta i filtri quando torni alla home
  document.getElementById('classe_select').value = "";
  document.getElementById('docente_select').value = "";
  document.getElementById('aula_select').value = "";
  document.getElementById('giorno_select').value = "";
  document.getElementById('ora_select').value = "";
}

// MODIFICA: Aggiorna 'aggiornaSelect' nella fetch originale
// per usare i placeholder corretti
function aggiornaSelect(sel, values, placeholderText) {
    // Svuota le opzioni esistenti (tranne la prima se è un placeholder)
    sel.innerHTML = '';
    
    // Aggiungi l'opzione placeholder
    let ph = document.createElement("option");
    ph.value = "";
    ph.textContent = placeholderText;
    sel.appendChild(ph);

    // Aggiungi i valori
    Array.from(values).sort().forEach(val => {
        let op = document.createElement("option");
        op.value = val;
        op.textContent = val;
        sel.appendChild(op);
    });
}

// ... all'interno della tua chiamata 'fetch':
fetch('orario_unificato.json')
  .then(resp => resp.json())
  .then(data => {
    orario = data;
    data.forEach(item => {
      // ... (logica per riempire i Set) ...
    });
    
    // Passa il testo del placeholder qui
    aggiornaSelect(document.getElementById('classe_select'), classiSet, "Filtra per Classe...");
    aggiornaSelect(document.getElementById('docente_select'), docentiSet, "Filtra per Docente...");
    aggiornaSelect(document.getElementById('aula_select'), aulaSet, "Filtra per Aula...");

    // Listener (ora con ricerca automatica)
    ['classe_select','docente_select','aula_select','giorno_select','ora_select'].forEach(id => {
      document.getElementById(id).addEventListener('change', function() {
        currentPage = 1; // reset pagina se cambio filtri!
        cerca(); // Cerca automaticamente al cambio
      });
    });
  });