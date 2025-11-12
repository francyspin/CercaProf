  let orario = null;
  let docentiSet = new Set(), aulaSet = new Set(), classiSet = new Set();
  let currentPage = 1;
  const resultsPerPage = 5;

  window.vaiPagina = function(page) {
    currentPage = page;
    cerca();
  }

const frasi = [
  "Seleziona i filtri sopra per cercare nell'orario scolastico.",
  "Premi <b>Cerca adesso</b> per vedere le lezioni attive.",
  "Nella sezione docenti puoi scoprire tutte le ore disponibili.",
  "Filtra per <b>aula</b> e trova laboratori liberi!",
  () => {
    const d = new Date();
    return `Oggi è ${d.toLocaleDateString()}, sono le ${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`;
  }
];

function ciclaBannerFrasi() {
  const box = document.getElementById('banner-frasi');
  let idx = 0;
  box.innerHTML = `<div class="frase-ciclica">${frasi[idx]}</div>`;
setInterval(() => {
  idx = (idx + 1) % frasi.length;
  box.querySelector(".frase-ciclica").style.opacity = 0;
  setTimeout(() => {
    // SE funzione, la esegue; se stringa, la mostra
    const frase = typeof frasi[idx] === "function" ? frasi[idx]() : frasi[idx];
    box.querySelector(".frase-ciclica").innerHTML = frase;
    box.querySelector(".frase-ciclica").style.opacity = 1;
  }, 400);
}, 3400);

}
ciclaBannerFrasi();

  // Banner Benvenuto animato (fuori da risultati)
  function mostraBannerBenvenuto() {
    document.getElementById('banner-benvenuto').innerHTML = `
      <span>🎓 Benvenuto! </span>
    `;
  }
  mostraBannerBenvenuto();

  document.addEventListener('DOMContentLoaded', mostraBenvenuto);

  // Orari scuola, in cima!
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

  function cerca() {
    document.body.classList.remove('senza-lezioni');
    const classe = document.getElementById('classe_select').value;
    const docente = document.getElementById('docente_select').value;
    const aula = document.getElementById('aula_select').value;
    const giorno = document.getElementById('giorno_select').value;
    const ora    = document.getElementById('ora_select').value;

    // Mostra benvenuto se nessun filtro selezionato!
    if (!classe && !docente && !aula && !giorno && !ora) {
      mostraBenvenuto();
      return;
    }

    let risultati = orario.filter(item => {
      let ok = true;
      if (classe)  ok = ok && item.Classe === classe;
      if (docente) ok = ok && item.Descrizione.includes(docente);
      if (aula)    ok = ok && item.Descrizione.includes(aula);
      if (giorno)  ok = ok && item.Giorno === giorno;
      if (ora)     ok = ok && item.Ora == ora;
      // Escludi tutte le righe con descrizione "NaN", null, vuota
      ok = ok && item.Descrizione && item.Descrizione !== "nan";
      return ok;
    });

    // Se solo la classe è selezionata e nessun altro filtro
  if (classe && !docente && !aula && !giorno && !ora) {
    const giorniOrario = ["Lun", "Mar", "Mer", "Gio", "Ven"];
    let risultatiGiorno = risultati.filter(r => r.Giorno === giorniOrario[currentPage-1]);
    // ORDINA per ora (numerico)
    risultatiGiorno.sort((a, b) => Number(a.Ora) - Number(b.Ora));
    mostraRisultati(risultatiGiorno, null, giorniOrario[currentPage-1], false, true);
  }
  else if (docente && !classe && !aula && !giorno && !ora) {
  const giorniOrario = ["Lun", "Mar", "Mer", "Gio", "Ven"];
  let risultatiGiorno = risultati.filter(r => r.Giorno === giorniOrario[currentPage-1]);
  // ORDINA per ora (numerico)
  risultatiGiorno.sort((a, b) => Number(a.Ora) - Number(b.Ora));
  mostraRisultati(risultatiGiorno, null, giorniOrario[currentPage-1], false, true);
}

  // Altrimenti ricerca e paginazione classica
  else {
      mostraRisultati(risultati);
    }
  }


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
      if(nowMinuti >= sMinuti && nowMinuti < eMinuti) {
        return (i+1).toString();
      }
    }
    return "";
  }

  function cercaAdesso() {
    document.body.classList.remove('senza-lezioni');
    const giorni = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
    const oggi = new Date();
    const giorno = giorni[oggi.getDay()];
    const ora_scuola = oraCorrenteScuola();

    // Prendi gli altri filtri dal DOM
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

    mostraRisultati(risultati, ora_scuola, giorno, true);
  }


  function mostraRisultati(risultati, ora_scuola = null, giorno = null, adessoMode = false, onlyClassGiorno = false){
  document.body.classList.remove('senza-lezioni');
  const box = document.getElementById('risultati');
  let pagi = "";
  let table = "";

  // ------ Banner speciale per cercaAdesso senza lezioni ------
  if(adessoMode && (!ora_scuola || ora_scuola === "" || typeof ora_scuola === "undefined" || risultati.length === 0)) {
    document.body.classList.add('senza-lezioni');
    // PAGINAZIONE: almeno 1 bottone anche se nessun risultato (disabilitato)
    pagi = `<div class="paginazione">`;
    pagi += `<button class="btn-pagi" disabled>1</button>`;
    pagi += `</div>`;
    table = `<table class="orario-tabella">
      <thead>
        <tr>
          <th>Classe</th>
          <th>Giorno</th>
          <th>Ora</th>
          <th>Docente</th>
          <th>Aula</th>
          <th>Descrizione</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="6" style="text-align:center; color:#e02538; font-size:1.16em"><em>Nessun risultato trovato.</em></td>
        </tr>
      </tbody>
    </table>`;
    box.innerHTML = `
      <div class="tabella-e-pagine">
        ${pagi}
        <div class="contenitore-tabella">
          ${table}
        </div>
      </div>
      <div class="banner-lezioni">
        <h2>Non ci sono lezioni attive al momento!</h2>
        <p>Le lezioni sono finite oppure non sono ancora iniziate.<br>
        Nessuna classe o docente risulta impegnato ora.</p>
      </div>
    `;
    return;
  }

  // ------- CASO NORMALE: tabella e paginazione sempre -------
  let risultatiPagina = risultati;
  let totalPages = 1;

  if (onlyClassGiorno) { // paginazione per giorno
    const giorniOrario = ["Lun", "Mar", "Mer", "Gio", "Ven"];
    pagi = `<div class="paginazione">`;
    for(let p=1; p<=5; p++) {
      pagi += `<button class="btn-pagi" onclick="window.vaiPagina(${p})"${p===currentPage?' style="font-weight:bold;"':''}>${giorniOrario[p-1]}</button>`;
    }
    pagi += `</div>`;
    // Nessun slicing qui: i risultati sono già filtrati per giorno
  } else { // paginazione classica ogni 5
    totalPages = Math.ceil(risultati.length / resultsPerPage);
    pagi = `<div class="paginazione">`;
    // Mostra almeno 1 bottone, anche se nessun risultato
    for(let p=1; p<=Math.max(totalPages, 1); p++) {
      pagi += `<button class="btn-pagi" onclick="window.vaiPagina(${p})"${p===currentPage?' style="font-weight:bold;"':''} ${totalPages === 0 ? 'disabled' : ''}>${p}</button>`;
    }
    pagi += `</div>`;
    // Slicing per pagina
    const start = (currentPage - 1) * resultsPerPage;
    const end = start + resultsPerPage;
    risultatiPagina = risultati.slice(start, end);
  }

  // ---- Tabella con header, risultati o messaggio vuoto ----
  if (risultatiPagina.length === 0) {
    table = `<table class="orario-tabella">
      <thead>
        <tr>
          <th>Classe</th>
          <th>Giorno</th>
          <th>Ora</th>
          <th>Docente</th>
          <th>Aula</th>
          <th>Descrizione</th>
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
          <th>Classe</th>
          <th>Giorno</th>
          <th>Ora</th>
          <th>Docente</th>
          <th>Aula</th>
          <th>Descrizione</th>
        </tr>
      </thead>
      <tbody>
        ${risultatiPagina.map(item => `
          <tr>
            <td>${item.Classe}</td>
            <td>${item.Giorno}</td>
            <td>${item.Ora}</td>
            <td>${(item.Descrizione.match(/\b([A-Z][a-z]+(?: [Dd]e| [Dd]i| [Dd]a| [Dd]el| [Dd]ella)?(?: [A-Z][a-z]+)? [A-Z]\.?)(?=\)|;|,|$)/g) || [''])[0]}</td>
            <td>${(item.Descrizione.match(/(\bLab\..+|\bAula.+|\bPalestre\b.+|\b[0-9]{3}|\b[ABC][0-9]{2,3}|[A-Z]+\s?\d{1,3})$/i) || [''])[0]}</td>
            <td>${item.Descrizione}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
  }

  // ------ Output finale, sempre con paginazione ------
  box.innerHTML = `
    <div class="tabella-e-pagine">
      ${pagi}
      <div class="contenitore-tabella">
        ${table}
      </div>
    </div>
  `;
}