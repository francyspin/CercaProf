// ============================
//   VARIABILI GLOBALI
// ============================
let orario = null;
let docentiSet = new Set(), aulaSet = new Set(), classiSet = new Set();
let currentPage = 1;
const resultsPerPage = 5;

// ============================
//   FUNZIONI UTILI (ESTRAZIONE)
// ============================
function estraiDocenti(desc) {
    if (!desc || typeof desc !== 'string') return [];
    let match = desc.match(/\(([^()]*)\)/);
    if (match && match[1]) {
        return match[1].split(/[;,]\s*/).map(x => x.trim()).filter(x => x.length > 0);
    }
    return [];
}
function estraiAula(desc) {
    if (!desc || typeof desc !== 'string') return '';
    let matches = desc.match(/\(([^()]*)\)/g);
    if (matches && matches.length > 1) {
        let aulaRaw = matches[1].replace(/[()]/g, '').trim();
        return aulaRaw;
    }
    return '';
}

// ============================
//   BANNER / FRASI CICLICHE
// ============================
function mostraBannerBenvenuto() {
    const el = document.getElementById('banner-benvenuto');
    if (el) el.innerHTML = `<span>🎓 Benvenuto! </span>`;
}
const frasi = [
    "Seleziona i filtri sopra per cercare nell'orario scolastico.",
    "Premi <b>Vedi lezioni attive</b> per vedere le lezioni che si stanno tenendo in questo momento.",
    "Nella sezione docenti puoi scoprire tutte le ore disponibili.",
    "Filtra per <b>aula</b> e trova laboratori liberi!",
    function () {
        const d = new Date();
        const giorni = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
        const giorno = giorni[d.getDay()];
        let oraScuola = oraCorrenteScuola();
        const isGiornoScolastico = giorno !== 'Dom' && giorno !== 'Sab';
        if (oraScuola !== null) {
            return `Oggi è ${d.toLocaleDateString()}, ora scolastica attuale: <b>${oraScuola}ª ora</b>`;
        } else if (isGiornoScolastico) {
            return `Oggi è ${d.toLocaleDateString()}, <b>attualmente fuori orario scolastico</b> ⏰`;
        } else {
            return `Oggi è ${d.toLocaleDateString()}, <b>buon weekend!</b> 🎉`;
        }
    }
];
function ciclaBannerFrasi() {
    const box = document.getElementById('banner-frasi');
    if (!box) return;
    let idx = 0;
    box.innerHTML = `<div class="frase-ciclica">${typeof frasi[idx] === "function" ? frasi[idx]() : frasi[idx]}</div>`;
    if (box.dataset.cicla) return;
    box.dataset.cicla = "1";
    setInterval(() => {
        idx = (idx + 1) % frasi.length;
        const node = box.querySelector(".frase-ciclica");
        if (!node) return;
        node.style.opacity = 0;
        setTimeout(() => {
            const frase = typeof frasi[idx] === "function" ? frasi[idx]() : frasi[idx];
            node.innerHTML = frase;
            node.style.opacity = 1;
        }, 400);
    }, 3400);
}
function mostraHome() {
    const bBen = document.getElementById('banner-benvenuto');
    const bFra = document.getElementById('banner-frasi');
    if (bBen) bBen.style.display = "";
    if (bFra) bFra.style.display = "";
    mostraBannerBenvenuto();
    ciclaBannerFrasi();
    const risultati = document.getElementById('risultati');
    if (risultati) risultati.style.display = "none";
    const infoCards = document.getElementById('infoCards');
    if (infoCards) infoCards.style.display = "grid";
    document.body.classList.remove('senza-lezioni');

    // Resetta filtri (se esistono)
    ['classe_select','docente_select','aula_select','giorno_select','ora_select'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

// ============================
//   INTERVALLI ORARI (per oraCorrenteScuola)
// ============================
const orari_scuola_per_classi = {
  "1_3_4_5": {
    "Lun": ["08:00-09:00","09:00-10:00","10:00-11:00","11:00-12:00","12:00-13:00","13:00-14:00"],
    "Mar": ["08:00-08:50","08:50-09:45","09:45-10:40","10:40-11:35","11:35-12:30","12:30-13:20","13:20-14:10"],
    "Mer": ["08:00-08:50","08:50-09:45","09:45-10:40","10:40-11:35","11:35-12:30","12:30-13:20"],
    "Gio": ["08:00-08:50","08:50-09:45","09:45-10:40","10:40-11:35","11:35-12:30","12:30-13:20","13:20-14:10"],
    "Ven": ["08:00-09:00","09:00-10:00","10:00-11:00","11:00-12:00","12:00-13:00","13:00-14:00"]
  },
  "2": {
    "Lun": ["08:00-09:00","09:00-10:00","10:00-11:00","11:00-12:00","12:00-13:00","13:00-14:00"],
    "Mar": ["08:00-08:50","08:50-09:45","09:45-10:40","10:40-11:35","11:35-12:30","12:30-13:20","13:20-14:10"],
    "Mer": ["08:00-08:50","08:50-09:45","09:45-10:40","10:40-11:35","11:35-12:30","12:30-13:20","13:20-14:10"],
    "Gio": ["08:00-08:50","08:50-09:45","09:45-10:40","10:40-11:35","11:35-12:30","12:30-13:20","13:20-14:10"],
    "Ven": ["08:00-09:00","09:00-10:00","10:00-11:00","11:00-12:00","12:00-13:00","13:00-14:00"]
  }
};
const intervalli_scuola = {
  "Lun":  { start: "10:45", end: "11:00" },
  "Ven":  { start: "10:45", end: "11:00" },
  "Mar":  { start: "11:20", end: "11:35" },
  "Mer":  { start: "11:20", end: "11:35" },
  "Gio":  { start: "11:20", end: "11:35" }
};

/* ============================
   OROLOGIO DINAMICO
   ============================ */
function aggiornaOrologio() {
  const now = new Date();
  const ore = String(now.getHours()).padStart(2, '0');
  const minuti = String(now.getMinutes()).padStart(2, '0');
  const secondi = String(now.getSeconds()).padStart(2, '0');
  
  const oraCorrente = document.querySelector('#orologio-dinamico .ora-corrente');
  const oraScolastica = document.querySelector('#orologio-dinamico .ora-scolastica');
  
  if (oraCorrente) {
    oraCorrente.textContent = `${ore}:${minuti}:${secondi}`;
  }
  
  const oraScolasticaCalcolata = calcolaOraScolastica(now);
  
  if (oraScolastica) {
    oraScolastica.textContent = oraScolasticaCalcolata.testo;
    if (oraScolasticaCalcolata.fuori) {
      oraScolastica.classList.add('fuori-orario');
    } else {
      oraScolastica.classList.remove('fuori-orario');
    }
  }
  // 🟢 Aggiorna box "Prossima Lezione"
  aggiornaProssimaLezione(now);
}

/* ============================
   PROSSIMA LEZIONE
   ============================ */
function aggiornaProssimaLezione(data) {
  const box = document.getElementById('prossima-lezione');
  if (!box || !orario) return;

  const giorni = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const giorno = giorni[data.getDay()];
  
  if (giorno === "Dom" || giorno === "Sab") {
    box.style.display = "none";
    return;
  }

  const classeSel = (document.getElementById('classe_select') || {}).value || "";
  if (!classeSel) {
    box.style.display = "none";
    return;
  }

  const ora_attuale = oraCorrenteScuola();
  const isSeconda = classeSel.startsWith("2") || classeSel.includes("2");
  const orariGiorno = isSeconda
    ? orari_scuola_per_classi["2"][giorno]
    : orari_scuola_per_classi["1_3_4_5"][giorno];

  if (!orariGiorno) {
    box.style.display = "none";
    return;
  }

  let prossimaOra = null;
  if (ora_attuale === "intervallo" || ora_attuale === null) {
    const ore = data.getHours();
    const min = data.getMinutes();
    const nowMinuti = ore * 60 + min;

    for (let i = 0; i < orariGiorno.length; i++) {
      let [start] = orariGiorno[i].split("-");
      let [sH, sM] = start.split(":").map(Number);
      let sMin = sH * 60 + sM;

      if (nowMinuti < sMin) {
        prossimaOra = i + 1;
        break;
      }
    }
  } else if (parseInt(ora_attuale) < orariGiorno.length) {
    prossimaOra = parseInt(ora_attuale) + 1;
  }

  if (!prossimaOra || prossimaOra > orariGiorno.length) {
    box.style.display = "none";
    return;
  }

  const prossimaLezione = orario.find(item => 
    item.Classe === classeSel && 
    item.Giorno === giorno && 
    item.Ora === prossimaOra &&
    item.Descrizione && 
    item.Descrizione !== "nan"
  );

  if (!prossimaLezione) {
    box.style.display = "none";
    return;
  }

  const materia = prossimaLezione.Descrizione.replace(/\s*\(.*\)/, '').trim();
  const docenti = estraiDocenti(prossimaLezione.Descrizione).join(", ");
  const aula = estraiAula(prossimaLezione.Descrizione);
  const orarioSlot = orariGiorno[prossimaOra - 1];
  const [inizioOra] = orarioSlot.split("-");

  const [oraInizio, minInizio] = inizioOra.split(":").map(Number);
  const minutiInizio = oraInizio * 60 + minInizio;
  const minutiNow = data.getHours() * 60 + data.getMinutes();
  const minutiMancanti = minutiInizio - minutiNow;

  box.innerHTML = `
    <div class="prossima-lezione-content">
      <div class="prossima-icona">⏰</div>
      <div class="prossima-info">
        <div class="prossima-titolo">Prossima lezione tra <strong>${minutiMancanti}</strong> min</div>
        <div class="prossima-dettagli">${materia} • ${docenti}${aula ? ` • ${aula}` : ''}</div>
      </div>
    </div>
  `;
  box.style.display = "block";
}
setInterval(aggiornaOrologio, 1000);
aggiornaOrologio();

/* ============================
   POPOLAMENTO SELECT (filtri)
   ============================ */
function aggiornaSelect(sel, values, placeholderText) {
    if (!sel) return;
    sel.innerHTML = '';
    let ph = document.createElement("option");
    ph.value = "";
    ph.textContent = placeholderText;
    sel.appendChild(ph);

    Array.from(values).sort().forEach(val => {
        let op = document.createElement("option");
        op.value = val;
        op.textContent = val;
        sel.appendChild(op);
    });
}

/* ============================
   CARICAMENTO DATI (JSON)
   ============================ */
fetch('orario_unificato.json')
    .then(resp => resp.json())
    .then(data => {
        orario = data;
        data.forEach(item => {
            if (item && item.Classe) classiSet.add(item.Classe);
            if (item && item.Descrizione) {
                estraiDocenti(item.Descrizione).forEach(nome => {
                    if (nome) docentiSet.add(nome);
                });
                let aula = estraiAula(item.Descrizione);
                if (aula) aulaSet.add(aula);
            }
        });

        aggiornaSelect(document.getElementById('classe_select'), classiSet, "Filtra per Classe...");
        aggiornaSelect(document.getElementById('docente_select'), docentiSet, "Filtra per Docente...");
        aggiornaSelect(document.getElementById('aula_select'), aulaSet, "Filtra per Aula...");
        

        ['classe_select','docente_select','aula_select','giorno_select','ora_select'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', function() {
                currentPage = 1;
                cerca();
            });
        });
    })
    .catch(error => console.error('Errore nel caricamento dei dati JSON:', error));

/* ============================
   RICERCA / FILTRI PRINCIPALE
   ============================ */
function cerca() {
    const bBen = document.getElementById('banner-benvenuto');
    const bFra = document.getElementById('banner-frasi');
    if (bBen) bBen.style.display = "none";
    if (bFra) bFra.style.display = "none";
    const infoCards = document.getElementById('infoCards');
    if (infoCards) infoCards.style.display = "none";
    document.body.classList.remove('senza-lezioni');

    const classe = (document.getElementById('classe_select') || {}).value || "";
    const docente = (document.getElementById('docente_select') || {}).value || "";
    const aula = (document.getElementById('aula_select') || {}).value || "";
    const giorno = (document.getElementById('giorno_select') || {}).value || "";
    const ora = (document.getElementById('ora_select') || {}).value || "";

    if (!classe && !docente && !aula && !giorno && !ora) {
        mostraHome();
        return;
    }

    if (!orario || orario.length === 0) {
        alert('Errore: dati non caricati.');
        return;
    }

    let vistaGriglia = false, tipoGriglia = '';
    if (classe && !docente && !aula && !giorno && !ora) {
        vistaGriglia = true; tipoGriglia = 'classe';
    } else if (docente && !classe && !aula && !giorno && !ora) {
        vistaGriglia = true; tipoGriglia = 'docente';
    }

    const boxRisultati = document.getElementById('risultati');
    if (boxRisultati) boxRisultati.classList.add('risultati-nascosti');

    setTimeout(() => {
        let risultati = orario.filter(item => {
            let ok = true;
            if (classe)  ok = ok && item.Classe === classe;
            if (docente) ok = ok && estraiDocenti(item.Descrizione).includes(docente);
            if (aula)    ok = ok && estraiAula(item.Descrizione) === aula;
            if (giorno)  ok = ok && item.Giorno === giorno;
            if (ora)     ok = ok && item.Ora == ora;
            ok = ok && item.Descrizione && item.Descrizione !== "nan";
            return ok;
        });

        risultati.sort((a, b) => {
            const giorniArr = ["Lun", "Mar", "Mer", "Gio", "Ven"];
            if (a.Giorno !== b.Giorno) {
                return giorniArr.indexOf(a.Giorno) - giorniArr.indexOf(b.Giorno);
            }
            return Number(a.Ora) - Number(b.Ora);
        });

        if (vistaGriglia) mostraGrigliaOrario(risultati, tipoGriglia);
        else mostraRisultati(risultati);

        if (boxRisultati) {
            boxRisultati.style.display = 'block';
            setTimeout(() => { boxRisultati.classList.remove('risultati-nascosti'); }, 30);
        }
    }, 80);
}

/* ============================
   "VEDI ADESSO" (cercaAdesso)
   ============================ */
function cercaAdesso() {
    const bBen = document.getElementById('banner-benvenuto');
    const bFra = document.getElementById('banner-frasi');
    if (bBen) bBen.style.display = "none";
    if (bFra) bFra.style.display = "none";
    const infoCards = document.getElementById('infoCards');
    if (infoCards) infoCards.style.display = "none";
    document.body.classList.remove('senza-lezioni');

    const giorni = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
    const oggi = new Date();
    const giorno = giorni[oggi.getDay()];
    const ora_scuola = oraCorrenteScuola();

    currentPage = 1;
    const classe = (document.getElementById('classe_select') || {}).value || "";
    const docente = (document.getElementById('docente_select') || {}).value || "";
    const aula = (document.getElementById('aula_select') || {}).value || "";

    const boxRisultati = document.getElementById('risultati');
    if (boxRisultati) {
        boxRisultati.classList.add('risultati-nascosti');
        boxRisultati.style.display = 'none';
    }

    setTimeout(() => {
        let risultati = [];

        // 🟢 CASO SPECIALE: Intervallo
        if (ora_scuola === "intervallo") {
            const ore = oggi.getHours();
            const min = oggi.getMinutes();
            const nowMinuti = ore * 60 + min;
            const classeSel = (document.getElementById('classe_select') || {}).value || "";
            const isSeconda = classeSel.startsWith("2") || classeSel.includes("2");
            const orariGiorno = isSeconda ? orari_scuola_per_classi["2"][giorno] : orari_scuola_per_classi["1_3_4_5"][giorno];
            
            let oraPrecedente = null;
            if (orariGiorno) {
                for (let i = 0; i < orariGiorno.length; i++) {
                    let [start, end] = orariGiorno[i].split("-");
                    let [eH, eM] = end.split(":").map(Number);
                    let eMin = eH * 60 + eM;
                    if (nowMinuti > eMin) oraPrecedente = i + 1;
                }
            }
            
            let risultatiPrecedenti = [];
            if (oraPrecedente && docente) {
                risultatiPrecedenti = orario.filter(item => {
                    let ok = item.Giorno === giorno && item.Ora === oraPrecedente;
                    ok = ok && estraiDocenti(item.Descrizione).includes(docente);
                    ok = ok && item.Descrizione && item.Descrizione !== "nan";
                    return ok;
                });
            }
            
            const box = document.getElementById('risultati');
            if (box) {
                let extraInfo = '';
                if (risultatiPrecedenti.length > 0 && docente) {
                    const item = risultatiPrecedenti[0];
                    const materia = item.Descrizione.replace(/\s*\(.*\)/, '').trim();
                    const aula = estraiAula(item.Descrizione);
                    extraInfo = `<p style="color: rgba(255,255,255,0.9); font-weight:500; margin-top:8px;">
                        📍 Nell'ora precedente (${oraPrecedente}ª): <b>${materia}</b> con <b>${item.Classe}</b>${aula ? ` in <b>${aula}</b>` : ''}
                    </p>`;
                }
                box.innerHTML = `
                <div class="banner-lezioni" style="background: linear-gradient(135deg, #FFA726 0%, #FF9800 100%); border: none;">
                    <div class="icona-banner" style="font-size: 3em;">☕</div>
                    <h2 style="color: white; margin-bottom: 10px;">È l'intervallo!</h2>
                    <p style="color: rgba(255,255,255,0.95); font-weight:500;">
                        Tutti gli studenti e i docenti sono in pausa. Le lezioni riprenderanno a breve.
                    </p>
                    ${extraInfo}
                </div>`;
                setTimeout(() => box.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            }
            if (boxRisultati) {
                boxRisultati.style.display = 'block';
                setTimeout(() => { boxRisultati.classList.remove('risultati-nascosti'); }, 10);
            }
            return;
        }

        if (ora_scuola !== null) {
            risultati = orario.filter(item => {
                let ok = true;
                ok = ok && item.Giorno === giorno;
                ok = ok && item.Ora.toString() === ora_scuola.toString();
                ok = ok && item.Descrizione && item.Descrizione !== "nan";
                if (classe)  ok = ok && item.Classe === classe;
                if (docente) ok = ok && estraiDocenti(item.Descrizione).includes(docente);
                if (aula)    ok = ok && estraiAula(item.Descrizione) === aula;
                return ok;
            });
        }

        mostraRisultati(risultati, ora_scuola, giorno, true);

        if (boxRisultati) {
            boxRisultati.style.display = 'block';
            setTimeout(() => { boxRisultati.classList.remove('risultati-nascosti'); }, 10);
        }
    }, 50);
}
/* ============================
   MOSTRA RISULTATI (tabella)
   Versione CORRETTA con Colori
   ============================ */
function mostraRisultati(risultati, ora_scuola = null, giorno = null, adessoMode = false){
    const paginaCorrente = typeof currentPage !== 'undefined' ? currentPage : 1; 
    const risultatiPerPagina = typeof resultsPerPage !== 'undefined' ? resultsPerPage : 15;

    document.body.classList.remove('senza-lezioni');
    
    const box = document.getElementById('risultati');
    let pagi = "";
    let table = "";
    
    const filtroDocenteSelezionato = (document.getElementById('docente_select') || {}).value || "";

    /* === ADESSO MODE === */
    if (adessoMode) {
        const oraValida = ora_scuola && ora_scuola.trim() !== "" && !isNaN(parseInt(ora_scuola));
        if (!oraValida) {
            document.body.classList.add('senza-lezioni');
            if (box) {
            box.innerHTML = `
                <div class="banner-lezioni">
                    <div class="icona-banner">⚠️</div>
                    <h2>Non ci sono lezioni attive al momento!</h2>
                    <p>Le lezioni sono finite oppure non sono ancora iniziate.</p>
                </div>`;
            setTimeout(() => box.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
            return;
        }
        if (risultati.length === 0) {
            const filtroClasse = (document.getElementById('classe_select') || {}).value || "";
            let titolo = "Nessuna lezione";
            let messaggio = `Attualmente (<b>${ora_scuola}ª ora</b>) non risulta nessuna lezione.`;
            if (filtroDocenteSelezionato) {
                titolo = "Docente Libero";
                messaggio = `Il prof. <b>${filtroDocenteSelezionato}</b> non ha lezione alla <b>${ora_scuola}ª ora</b>.`;
            } else if (filtroClasse) {
                titolo = "Classe Libera";
                messaggio = `La classe <b>${filtroClasse}</b> non ha lezione alla <b>${ora_scuola}ª ora</b>.`;
            }
            if (box) {
                box.innerHTML = `
                <div class="banner-lezioni" style="background: #fff; border-color: #4caf50; color: #2e7d32;">
                    <div class="icona-banner" style="font-size: 2.5em;">☕</div>
                    <h2 style="color: #2e7d32; margin-bottom: 10px;">${titolo}</h2>
                    <p style="color: #4caf50; font-weight:600;">${messaggio}</p>
                </div>`;
                setTimeout(() => box.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            }
            return;
        }
    }

    /* === TABELLA / PAGINAZIONE === */
    const totalPages = Math.ceil(risultati.length / risultatiPerPagina);
    if (!adessoMode && totalPages > 1) {
        if (typeof generaPaginazione !== 'undefined') {
             pagi = generaPaginazione(paginaCorrente, totalPages);
        }
    }
    const risultatiDaMostrare = adessoMode ? risultati : risultati.slice((paginaCorrente - 1) * risultatiPerPagina, (paginaCorrente - 1) * risultatiPerPagina + risultatiPerPagina);

    if (risultatiDaMostrare.length === 0 && !adessoMode) {
        table = `<table class="orario-tabella">
            <tbody><tr><td colspan="5" style="text-align:center; color:#e02538;"><em>Nessun risultato trovato.</em></td></tr></tbody>
        </table>`;
    } else {
        table = `<table class="orario-tabella ${adessoMode ? 'now-mode' : ''}">
            <thead>
                <tr>
                    <th>Classe</th>
                    ${!adessoMode ? '<th>Giorno</th>' : ''} 
                    <th>Ora</th>
                    <th>Docente</th>
                    <th>Materia/Aula</th>
                </tr>
            </thead>
            <tbody>
                ${risultatiDaMostrare.map(item => {
                    const docentiArray = estraiDocenti(item.Descrizione);
                    const cellaDocente = docentiArray.join('<br>');
                    
                    let classeInMateria = '';
                    if (!adessoMode && filtroDocenteSelezionato) {
                        classeInMateria = `<br><span class="cella-classe">(Classe: ${item.Classe})</span>`;
                    }
                    
                    const materia = item.Descrizione.replace(/\s*\(.*\)/, '').trim(); 
                    const aulaRaw = estraiAula(item.Descrizione);
                    const aulaHtml = aulaRaw ? `<br><small><span class="cella-aula">📍 ${aulaRaw}</span></small>` : '';
                    
                    const cellaMateria = `${materia}${classeInMateria}${aulaHtml}`;
                    
                    const classeSel = (document.getElementById('classe_select') || {}).value || "";
                    const isSeconda = classeSel.startsWith("2") || classeSel.includes("2");
                    const orariGiorno = isSeconda ? orari_scuola_per_classi["2"][item.Giorno] : orari_scuola_per_classi["1_3_4_5"][item.Giorno];
                    const orarioSlot = orariGiorno && orariGiorno[item.Ora - 1] ? orariGiorno[item.Ora - 1] : '';

                    return `
                        <tr>
                            <td class="cella-classe">${item.Classe}</td>
                            ${!adessoMode ? `<td>${item.Giorno}</td>` : ''}
                            <td>${item.Ora}ª${orarioSlot ? `<br><small style="font-size:0.8em;color:rgba(255,255,255,0.65);font-weight:500;background:rgba(0,0,0,0.1);padding:2px 6px;border-radius:3px;display:inline-block;margin-top:2px;">⏰ ${orarioSlot}</small>` : ''}</td>
                            <td class="cella-docente">${cellaDocente}</td>
                            <td>${cellaMateria}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>`;
    }

let contatore = "";
if (!adessoMode) {
    contatore = `<div class="info-risultati">
        <span class="icona-risultati">📋</span>
        <strong>${risultati.length}</strong> ${risultati.length === 1 ? 'risultato trovato' : 'risultati trovati'}
    </div>`;
} else {
    contatore = `<div class="info-risultati attive">
        <span class="icona-risultati">🟢</span>
        Lezioni in corso adesso (<strong>${ora_scuola}ª ora</strong>)
    </div>`;
}

let extraClass = adessoMode ? "mode-adesso" : "";

let headerRisultati = "";
if (!adessoMode && risultati.length > 0) {
    headerRisultati = `<div class="header-risultati">
        <div class="contatore-risultati">${risultati.length} risultati</div>
        ${pagi}
    </div>`;
} else if (!adessoMode) {
    headerRisultati = pagi;
}

if (box) {
    box.innerHTML = `
    <div class="tabella-e-pagine">
        ${contatore}
        ${pagi}
        <div class="contenitore-tabella ${extraClass}">
            ${table}
        </div>
    </div>`;
    if (risultati.length > 0 || adessoMode) {
        setTimeout(() => box.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
}
}

/* ============================
   MOSTRA GRIGLIA SETTIMANALE
   ============================ */
function mostraGrigliaOrario(risultati, tipo) {
    const giorni = ["Lun", "Mar", "Mer", "Gio", "Ven"];
    const ore = ["1", "2", "3", "4", "5", "6", "7"];
    const griglia = {};
    giorni.forEach(g => {
        griglia[g] = {};
        ore.forEach(o => { griglia[g][o] = []; });
    });

    risultati.forEach(item => {
        if (griglia[item.Giorno] && griglia[item.Giorno][item.Ora]) {
            griglia[item.Giorno][item.Ora].push(item);
        }
    });

    let table = `<table class="orario-griglia">
        <thead><tr><th>Ora</th>${giorni.map(g=>`<th>${g}</th>`).join('')}</tr></thead>
        <tbody>`;
    
    ore.forEach(o => {
        table += `<tr><td class="ora-header">${o}ª</td>`;
        giorni.forEach(g => {
            const lezioni = griglia[g][o];
            const classeSel = (document.getElementById('classe_select') || {}).value || "";
            const isSeconda = classeSel.startsWith("2") || classeSel.includes("2");
            const orariGiorno = isSeconda ? orari_scuola_per_classi["2"][g] : orari_scuola_per_classi["1_3_4_5"][g];
            const orarioSlot = orariGiorno && orariGiorno[o - 1] ? `<div style="font-size:0.75em;font-weight:500;margin-bottom:4px;color:rgba(255,255,255,0.65);padding:2px 4px;background:rgba(0,0,0,0.15);border-radius:3px;display:inline-block;">⏰ ${orariGiorno[o - 1]}</div>` : '';
            table += `<td class="${lezioni.length > 0 ? 'lezione-attiva' : 'libero'}">`;
            
            if (lezioni.length > 0) {
                table += orarioSlot;
                lezioni.forEach(item => {
                    const desc = item.Descrizione;
                    const docentiTrovati = estraiDocenti(desc);
                    const aulaText = estraiAula(desc);

                    // Estrai materia pulita
                    let materia = desc;
                    if (docentiTrovati.length > 0) docentiTrovati.forEach(d => materia = materia.replace(d, ''));
                    if (aulaText) materia = materia.replace(aulaText, '');
                    materia = materia.replace(/\([\s\S]*?\)/g, '').replace(/[\(\);,]/g, '').replace(/\s{2,}/g, ' ').trim();

                    // Layout semplice e pulito
                    table += `<div class="cella-lezione">`;
                    table += `<div class="materia-griglia">${materia}</div>`;
                    
                    if (docentiTrovati.length > 0) {
                        table += `<div class="info-griglia"><span class="cella-docente">${docentiTrovati.join(', ')}</span></div>`;
                    }
                    
                    if (tipo === 'docente') {
                        table += `<div class="info-griglia"><span class="cella-classe">${item.Classe}</span></div>`;
                    }
                    
                    if (aulaText) {
                        table += `<div class="info-griglia"><span class="cella-aula">${aulaText}</span></div>`;
                    }
                    
                    table += `</div>`;
                });
            } else {
                table += orarioSlot;
                table += `<span class="slot-libero">Libero</span>`;
            }
            table += `</td>`;
        });
        table += `</tr>`;
    });
    table += `</tbody></table>`;

    const box = document.getElementById('risultati');
    if (box) {
        box.innerHTML = `<div class="contenitore-tabella griglia-settimanale">${table}</div>`;
        box.style.display = 'block';
        setTimeout(() => { 
            box.classList.remove('risultati-nascosti');
            box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}


/* ============================
   calcolaOraScolastica / oraCorrenteScuola
   ============================ */
function calcolaOraScolastica(data) {
    const giorni = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
    const giorno = giorni[data.getDay()];

    if (giorno === "Dom" || giorno === "Sab") {
        return { testo: "📅 Weekend", fuori: true };
    }

    // classe selezionata
    const classeSel = (document.getElementById('classe_select') || {}).value || "";
    const isSeconda = classeSel.startsWith("2") || classeSel.includes("2");

    const orariGiorno = isSeconda
        ? orari_scuola_per_classi["2"][giorno]
        : orari_scuola_per_classi["1_3_4_5"][giorno];

    if (!orariGiorno) {
        return { testo: "🏠 Lezioni terminate", fuori: true };
    }

    const ore = data.getHours();
    const min = data.getMinutes();
    const nowMinuti = ore * 60 + min;

    // prima dell'inizio delle lezioni
    let [hS, mS] = orariGiorno[0].split("-")[0].split(":").map(Number);
    let startMin = hS * 60 + mS;

    if (nowMinuti < startMin) {
        return { testo: `⏰ Inizio tra ${startMin - nowMinuti} min`, fuori: true };
    }

    // ciclo sugli intervalli
    for (let i = 0; i < orariGiorno.length; i++) {
        let [start, end] = orariGiorno[i].split("-");
        let [sH, sM] = start.split(":").map(Number);
        let [eH, eM] = end.split(":").map(Number);

        let sMin = sH * 60 + sM;
        let eMin = eH * 60 + eM;

        if (nowMinuti >= sMin && nowMinuti < eMin) {
            return {
                testo: `📚 ${i + 1}ª ora (${eMin - nowMinuti} min)`,
                fuori: false
            };
        }

        // intervallo tra due ore
        if (
            i < orariGiorno.length - 1 &&
            nowMinuti >= eMin &&
            nowMinuti < (parseInt(orariGiorno[i + 1].split("-")[0].replace(":", "")) / 100 * 60)
        ) {
            return { testo: "☕ Intervallo", fuori: true };
        }
    }

    return { testo: "🏠 Lezioni terminate", fuori: true };
}

function oraCorrenteScuola() {
    const giorni = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
    const oggi = new Date();
    const giorno = giorni[oggi.getDay()];
    const ora = oggi.getHours();
    const min = oggi.getMinutes();
    const nowMinuti = ora * 60 + min;

    const classeSel = (document.getElementById('classe_select') || {}).value || "";
    const isSeconda = classeSel.startsWith("2") || classeSel.includes("2");

    const orariGiorno = isSeconda
        ? orari_scuola_per_classi["2"][giorno]
        : orari_scuola_per_classi["1_3_4_5"][giorno];

    if (!orariGiorno) return null;

    // 🟢 controllo intervallo
    const intervallo = intervalli_scuola[giorno];
    if (intervallo) {
        const [iH, iM] = intervallo.start.split(":").map(Number);
        const [fH, fM] = intervallo.end.split(":").map(Number);
        const iMin = iH * 60 + iM;
        const fMin = fH * 60 + fM;

        if (nowMinuti >= iMin && nowMinuti < fMin) return "intervallo";
    }

    // ore normali
    for (let i = 0; i < orariGiorno.length; i++) {
        let [start, end] = orariGiorno[i].split("-");
        let [sH, sM] = start.split(":").map(Number);
        let [eH, eM] = end.split(":").map(Number);

        let sMin = sH * 60 + sM;
        let eMin = eH * 60 + eM;

        if (nowMinuti >= sMin && nowMinuti < eMin) {
            return (i + 1).toString();
        }
    }
    return null;
}



/* ============================
   PAGINAZIONE (UI)
   ============================ */
function generaPaginazione(currentPage, totalPages) {
    const maxShown = 10;
    let start = Math.floor((currentPage-1) / maxShown) * maxShown + 1;
    let end = Math.min(start + maxShown - 1, totalPages);
    let pagi = `<div class="paginazione-wrapper">
        <div class="label-paginazione">Pagina:</div>
        <div class="paginazione">`;

    if (start > 1) {
        pagi += `<button class="btn-pagi" onclick="window.vaiPagina(${start-1})" title="Pagina precedente">&laquo;</button>`;
    }
    for (let p = start; p <= end; p++) {
        const isActive = p === currentPage;
        pagi += `<button class="btn-pagi ${isActive ? 'active' : ''}" onclick="window.vaiPagina(${p})">${p}</button>`;
    }
    if (end < totalPages) {
        pagi += `<button class="btn-pagi" onclick="window.vaiPagina(${end+1})" title="Pagina successiva">&raquo;</button>`;
    }
    pagi += `</div></div>`;
    return pagi;
}
window.vaiPagina = function(page) {
    currentPage = page;
    cerca();
};
window.resetFiltri = function() {
    currentPage = 1;
    mostraHome();
};

window.esportaPDF = function() {
  const classe = (document.getElementById('classe_select') || {}).value || "";
  const docente = (document.getElementById('docente_select') || {}).value || "";
  const aula = (document.getElementById('aula_select') || {}).value || "";
  
  if (!classe && !docente && !aula) {
    alert("⚠️ Seleziona almeno un filtro (Classe, Docente o Aula) prima di esportare!");
    return;
  }

  let risultati = orario.filter(item => {
    let ok = true;
    if (classe) ok = ok && item.Classe === classe;
    if (docente) ok = ok && estraiDocenti(item.Descrizione).includes(docente);
    if (aula) ok = ok && estraiAula(item.Descrizione) === aula;
    ok = ok && item.Descrizione && item.Descrizione !== "nan";
    return ok;
  });

  if (risultati.length === 0) {
    alert("⚠️ Nessun risultato da esportare!");
    return;
  }

  let titolo = classe ? `Orario Classe ${classe}` : docente ? `Orario Prof. ${docente}` : `Orario Aula ${aula}`;

  const giorni = ["Lun", "Mar", "Mer", "Gio", "Ven"];
  const ore = ["1", "2", "3", "4", "5", "6", "7"];
  const griglia = {};
  giorni.forEach(g => {
    griglia[g] = {};
    ore.forEach(o => { griglia[g][o] = []; });
  });

  risultati.forEach(item => {
    if (griglia[item.Giorno] && griglia[item.Giorno][item.Ora]) {
      griglia[item.Giorno][item.Ora].push(item);
    }
  });

  let tableHTML = '<table class="orario-griglia"><thead><tr><th>Ora</th>';
  giorni.forEach(g => tableHTML += `<th>${g}</th>`);
  tableHTML += '</tr></thead><tbody>';
  
  ore.forEach(o => {
    tableHTML += `<tr><td class="ora-header">${o}ª</td>`;
    giorni.forEach(g => {
      const lezioni = griglia[g][o];
      tableHTML += `<td class="${lezioni.length > 0 ? 'lezione-attiva' : 'libero'}">`;
      
      if (lezioni.length > 0) {
        lezioni.forEach(item => {
          const docentiTrovati = estraiDocenti(item.Descrizione);
          const aulaText = estraiAula(item.Descrizione);
          let materia = item.Descrizione.replace(/\s*\(.*\)/, '').trim();
          
          tableHTML += '<div class="cella-lezione">';
          tableHTML += `<div class="materia-griglia">${materia}</div>`;
          if (docentiTrovati.length > 0) tableHTML += `<div class="info-griglia"><span class="cella-docente">${docentiTrovati.join(', ')}</span></div>`;
          if (aulaText) tableHTML += `<div class="info-griglia"><span class="cella-aula">${aulaText}</span></div>`;
          tableHTML += '</div>';
        });
      } else {
        tableHTML += '<span class="slot-libero">-</span>';
      }
      tableHTML += '</td>';
    });
    tableHTML += '</tr>';
  });
  tableHTML += '</tbody></table>';

  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${titolo}</title><style>@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');*{margin:0;padding:0;box-sizing:border-box}@page{size:A4 landscape;margin:8mm}body{font-family:'Poppins',sans-serif;padding:8px;background:#FAFAFA;background-image:radial-gradient(circle at 0% 0%,rgba(209,196,233,0.4) 0%,transparent 50%),radial-gradient(circle at 100% 100%,rgba(149,117,205,0.2) 0%,transparent 50%)}h1{color:#fff;background:linear-gradient(135deg,#9575CD 0%,#673AB7 100%);display:block;padding:6px 16px;border-radius:10px;font-size:1em;font-weight:600;box-shadow:0 4px 12px rgba(103,58,183,0.2);margin:0 auto 8px;text-align:center;width:fit-content}.info-risultati{text-align:center;margin-bottom:6px;padding:4px 12px;background:#F3E5F5;border-radius:8px;color:#5E35B1;font-size:0.7em;font-weight:600}.contenitore-tabella{background:rgba(30,20,60,0.95);border-radius:10px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 32px rgba(0,0,0,0.3);overflow:hidden;width:100%;margin:0 auto}.orario-griglia{width:100%;border-collapse:separate;border-spacing:0;font-size:0.65em}.orario-griglia th{background-color:rgba(255,255,255,0.1);color:#fff;padding:5px 3px;text-align:center;font-weight:700;text-transform:uppercase;font-size:0.8em;letter-spacing:0.3px;border-bottom:1px solid rgba(255,255,255,0.1)}.orario-griglia td{padding:4px 3px;color:rgba(255,255,255,0.95);border:1px solid rgba(255,255,255,0.05);vertical-align:top;text-align:left;font-size:0.95em;max-height:80px;overflow:hidden}.orario-griglia td.ora-header{font-weight:600;text-align:center;width:35px;background-color:rgba(255,255,255,0.05)}.orario-griglia td.libero{text-align:center;vertical-align:middle;font-style:italic;opacity:0.5}.slot-libero{color:rgba(255,255,255,0.6);font-size:0.85em}.cella-lezione{margin-bottom:4px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.06)}.cella-lezione:last-child{margin-bottom:0;padding-bottom:0;border-bottom:none}.materia-griglia{font-size:0.85em;font-weight:600;color:rgba(255,255,255,0.95);margin-bottom:1px;line-height:1.1}.info-griglia{font-size:0.7em;margin:0;color:rgba(255,255,255,0.8);line-height:1}.cella-docente{color:#9575CD!important;font-weight:600!important}.cella-aula{color:rgba(255,255,255,0.65)!important}@media print{body{background:#fff!important;padding:5mm;height:100vh}h1{background:linear-gradient(135deg,#673AB7 0%,#512DA8 100%)!important;color:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;page-break-after:avoid;margin-bottom:5px}.info{-webkit-print-color-adjust:exact;print-color-adjust:exact;page-break-after:avoid}.contenitore{box-shadow:none;border:2px solid #673AB7;background:rgba(30,20,60,0.95)!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;page-break-inside:avoid;flex:1}table{page-break-inside:avoid;height:100%}th,td,.cella-lezione{-webkit-print-color-adjust:exact;print-color-adjust:exact;page-break-inside:avoid}}</style></head><body><h1>${titolo}</h1><div style="text-align:center;margin-bottom:6px;"><div class="info-risultati">📋 Orario Settimanale • ${new Date().toLocaleDateString('it-IT')}</div></div><div class="contenitore-tabella">${tableHTML}</div></body></html>`;

  const finestra = window.open('', '_blank');
  finestra.document.write(html);
  finestra.document.close();
  setTimeout(() => { finestra.print(); }, 800);
};



/* ============================
   DARK MODE (Versione definitiva e unica)
   ============================ */
(function () {
  const btn = document.getElementById('darkModeToggle');

  function setDarkMode(on, save = true) {
    if (on) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    
    btn.setAttribute('aria-pressed', on);
    btn.innerHTML = on ? '☀️' : '🌙'; // Solo emoji, no testo    
    if (save) localStorage.setItem('itt_dark_mode', on ? '1' : '0');
  }

  function initializeDarkMode() {
    const saved = localStorage.getItem('itt_dark_mode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (saved === '1') setDarkMode(true, false);
    else if (saved === '0') setDarkMode(false, false);
    else setDarkMode(prefersDark, false); // prima volta → segue il sistema

    btn.addEventListener('click', () => {
      const isOn = document.body.classList.contains('dark-mode');
      setDarkMode(!isOn, true);
    });
  }

  // Supporta anche cambio preferenza sistema mentre la pagina è aperta
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('itt_dark_mode')) { // solo se l'utente non ha scelto manualmente
      setDarkMode(e.matches, false);
    }
  });

  // Avvio
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDarkMode);
  } else {
    initializeDarkMode();
  }
})();

/* ============================
   INIZIALIZZAZIONE FINALE
   (unico DOMContentLoaded, pulito)
   ============================ */
document.addEventListener('DOMContentLoaded', function() {
  // Mostra home iniziale
  mostraHome();

  // Aggiungi listener ai pulsanti principali se esistono
  const btnAdesso = document.querySelector('.btn-adesso');
  if (btnAdesso) btnAdesso.addEventListener('click', cercaAdesso);

  // Assicura handler per reset filtri se presente
  const btnReset = document.querySelector('.btn-reset');
  if (btnReset) btnReset.addEventListener('click', function() {
    currentPage = 1;
    mostraHome();
  });

  // Eventuali select (se fetch non le ha ancora popolati, gli handler verranno aggiunti al termine del fetch)
  ['classe_select','docente_select','aula_select','giorno_select','ora_select'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', function() {
          currentPage = 1;
          cerca();
      });
  });
});


// OVERRIDE ESPORTA PDF - VERSIONE FINALE
window.esportaPDF = function() {
  const classe = (document.getElementById('classe_select') || {}).value || "";
  const docente = (document.getElementById('docente_select') || {}).value || "";
  const aula = (document.getElementById('aula_select') || {}).value || "";
  
  if (!classe && !docente && !aula) {
    alert("⚠️ Seleziona almeno un filtro!");
    return;
  }

  let risultati = orario.filter(item => {
    let ok = true;
    if (classe) ok = ok && item.Classe === classe;
    if (docente) ok = ok && estraiDocenti(item.Descrizione).includes(docente);
    if (aula) ok = ok && estraiAula(item.Descrizione) === aula;
    ok = ok && item.Descrizione && item.Descrizione !== "nan";
    return ok;
  });

  if (risultati.length === 0) {
    alert("⚠️ Nessun risultato!");
    return;
  }

  let nomeFile = classe ? `Orario_${classe}` : docente ? `Orario_${docente.replace(/\s+/g, '_')}` : `Orario_Aula_${aula}`;
  let titolo = classe ? `Orario ${classe}` : docente ? `Prof. ${docente}` : `Aula ${aula}`;

  const giorni = ["Lun", "Mar", "Mer", "Gio", "Ven"];
  const ore = ["1", "2", "3", "4", "5", "6", "7"];
  const griglia = {};
  giorni.forEach(g => {
    griglia[g] = {};
    ore.forEach(o => { griglia[g][o] = []; });
  });

  risultati.forEach(item => {
    if (griglia[item.Giorno] && griglia[item.Giorno][item.Ora]) {
      griglia[item.Giorno][item.Ora].push(item);
    }
  });

  let tableHTML = '<table style="width:100%;border-collapse:collapse;font-size:0.7em;"><thead><tr><th style="background:rgba(255,255,255,0.1);color:#fff;padding:5px 3px;text-align:center;font-weight:700;text-transform:uppercase;font-size:0.8em;border:1px solid rgba(255,255,255,0.1);">Ora</th>';
  giorni.forEach(g => tableHTML += `<th style="background:rgba(255,255,255,0.1);color:#fff;padding:5px 3px;text-align:center;font-weight:700;text-transform:uppercase;font-size:0.8em;border:1px solid rgba(255,255,255,0.1);">${g}</th>`);
  tableHTML += '</tr></thead><tbody>';
  
  ore.forEach(o => {
    tableHTML += `<tr><td style="font-weight:600;text-align:center;padding:5px 3px;background:rgba(255,255,255,0.05);color:#fff;width:35px;border:1px solid rgba(255,255,255,0.1);">${o}ª</td>`;
    giorni.forEach(g => {
      const lezioni = griglia[g][o];
      tableHTML += `<td style="padding:5px 3px;vertical-align:top;color:rgba(255,255,255,0.95);border:1px solid rgba(255,255,255,0.1);">`;
      
      if (lezioni.length > 0) {
        lezioni.forEach((item, idx) => {
          const docenti = estraiDocenti(item.Descrizione);
          const aulaItem = estraiAula(item.Descrizione);
          let materia = item.Descrizione.replace(/\s*\(.*\)/, '').trim();
          
          if (idx > 0) tableHTML += '<div style="margin-top:3px;padding-top:3px;border-top:1px solid rgba(255,255,255,0.15);"></div>';
          tableHTML += `<div style="font-weight:600;color:rgba(255,255,255,0.95);font-size:0.85em;">${materia}</div>`;
          if (docenti.length > 0) tableHTML += `<div style="font-size:0.75em;color:#9575CD;">${docenti.join(', ')}</div>`;
          if (aulaItem) tableHTML += `<div style="font-size:0.7em;color:rgba(255,255,255,0.7);">${aulaItem}</div>`;
        });
      } else {
        tableHTML += '<span style="color:rgba(255,255,255,0.5);font-style:italic;font-size:0.8em;">Libero</span>';
      }
      tableHTML += '</td>';
    });
    tableHTML += '</tr>';
  });
  tableHTML += '</tbody></table>';

  const elemento = document.createElement('div');
  elemento.style.cssText = 'width:297mm;height:210mm;background:rgba(30,20,60,0.95);padding:8mm;box-sizing:border-box;font-family:Poppins,sans-serif;color:#fff;';
  elemento.innerHTML = `
    <h1 style="text-align:center;color:#fff;background:linear-gradient(135deg,#9575CD,#673AB7);padding:6px 16px;border-radius:10px;font-size:1em;margin:0 auto 6px;width:fit-content;">${titolo}</h1>
    <p style="text-align:center;color:#D1C4E9;margin-bottom:6px;font-size:0.7em;">📋 Orario Settimanale • ${new Date().toLocaleDateString('it-IT')}</p>
    ${tableHTML}
  `;

  const opt = {
    margin: 0,
    filename: `${nomeFile}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, backgroundColor: '#1e143c' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };

  html2pdf().set(opt).from(elemento).save();
};
