let orario = null;
let docentiSet = new Set(), aulaSet = new Set(), classiSet = new Set();
let currentPage = 1;
const resultsPerPage = 5;

window.vaiPagina = function(page) {
  currentPage = page;
  cerca();
}

// Mostra benvenuto all'avvio della pagina
function mostraBenvenuto() {
  const box = document.getElementById('risultati');
  box.innerHTML = `
    <div class="benvenuto">
      <h2>Benvenuto!</h2>
      <p>Seleziona sopra i filtri per cercare docenti, classi o aule dell'orario scolastico!</p>
    </div>
  `;
}
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
  const classe = document.getElementById('classe_select').value;
  const docente = document.getElementById('docente_select').value;
  const aula = document.getElementById('aula_select').value;
  const giorno = document.getElementById('giorno_select').value;
  const ora    = document.getElementById('ora_select').value;

  // Mostra benvenuto se nessun filtro selezionato!
  if(!classe && !docente && !aula && !giorno && !ora) {
    mostraBenvenuto();
    return;
  }

  let risultati = orario.filter(item => {
    let ok = true;
    if(classe) ok = ok && item.Classe === classe;
    if(docente) ok = ok && item.Descrizione.includes(docente);
    if(aula) ok = ok && item.Descrizione.includes(aula);
    if(giorno) ok = ok && item.Giorno === giorno;
    if(ora)    ok = ok && item.Ora == ora;
    // Escludi tutte le righe con descrizione "NaN", null, vuota
    ok = ok && item.Descrizione && item.Descrizione !== "nan";
    return ok;
  });


  // Se solo la classe è selezionata e nessun altro filtro
  if (classe && !docente && !aula && !giorno && !ora) {
    // Visualizza orario per un giorno alla volta, ogni pagina = un giorno
    const giorniOrario = ["Lun", "Mar", "Mer", "Gio", "Ven"];
    risultati = risultati.filter(r => r.Giorno === giorniOrario[currentPage-1]);
    mostraRisultati(risultati, null, giorniOrario[currentPage-1], false, true);
  } else {
    // Ricerca standard e paginazione classica
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
  const box = document.getElementById('risultati');
if(adessoMode && (!ora_scuola || ora_scuola === "" || typeof ora_scuola === "undefined" || risultati.length === 0)) {
  document.body.classList.add('senza-lezioni');
  box.innerHTML = `
    <div class="banner-lezioni">
      <h2>Non ci sono lezioni attive al momento!</h2>
      <p>Le lezioni sono finite oppure non sono ancora iniziate.<br>
      Nessuna classe o docente risulta impegnato ora.</p>
    </div>
  `;
  return;
}


  if (risultati.length === 0) {
    box.innerHTML = "<em>Nessun risultato trovato.</em>";
    return;
  }

  let pagi = "";
  // --- Se selezionata solo classe: mostro un solo giorno per pagina ---
  if (onlyClassGiorno) {
    const giorniOrario = ["Lun", "Mar", "Mer", "Gio", "Ven"];
    pagi = `<div class="paginazione">`;
    for(let p=1; p<=5; p++) {
      pagi += `<button class="btn-pagi" onclick="window.vaiPagina(${p})"${p===currentPage?' style="font-weight:bold;"':''}>${giorniOrario[p-1]}</button>`;
    }
    pagi += `</div>`;
  } else {
    // --- paginazione classica ogni 5 ---
    const totalPages = Math.ceil(risultati.length / resultsPerPage);
    if (currentPage > totalPages) currentPage = 1;
    const start = (currentPage - 1) * resultsPerPage;
    const end = start + resultsPerPage;
    risultati = risultati.slice(start, end);

    pagi = `<div class="paginazione">`;
    for(let p=1; p<=totalPages; p++) {
      pagi += `<button class="btn-pagi" onclick="window.vaiPagina(${p})"${p===currentPage?' style="font-weight:bold;"':''}>${p}</button>`;
    }
    pagi += `</div>`;
  }

  let table = `<table class="orario-tabella">
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
  `;
  table += risultati.map(item => `
    <tr>
      <td>${item.Classe}</td>
      <td>${item.Giorno}</td>
      <td>${item.Ora}</td>
      <td>${(item.Descrizione.match(/([A-Z][a-z]+ [A-Z]\.?)/g) || [''])[0]}</td>
      <td>${(item.Descrizione.match(/(\bLab\..+|\bAula.+|\bPalestre\b.+|\b[0-9]{3}|\b[ABC][0-9]{2,3}|[A-Z]+\s?\d{1,3})$/i) || [''])[0]}</td>
      <td>${item.Descrizione}</td>
    </tr>
  `).join('');
  table += `</tbody></table>`;

 box.innerHTML = `
  <div class="tabella-e-pagine">
    <div class="paginazione">
      ${pagi}
    </div>
    ${table}
  </div>
`;

}
