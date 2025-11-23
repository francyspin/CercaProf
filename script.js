/* =========================================================
   JS PULITO E UNIFICATO - Versione "orario_unificato"
   ========================================================= */

/* ============================
   VARIABILI GLOBALI
   ============================ */
let orario = null;
let docentiSet = new Set(), aulaSet = new Set(), classiSet = new Set();
let currentPage = 1;
const resultsPerPage = 5;

/* ============================
   FUNZIONI UTILI (ESTRAZIONE)
   ============================ */
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

/* ============================
   BANNER / FRASI CICLICHE
   ============================ */
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

/* ============================
   INTERVALLI ORARI (per oraCorrenteScuola)
   ============================ */
const orari_scuola = {
    "Lun": ["08:00-09:00","09:00-10:00","10:00-11:00","11:00-12:00","12:00-13:00","13:00-14:00","13:20-14:10"],
    "Ven": ["08:00-09:00","09:00-10:00","10:00-11:00","11:00-12:00","12:00-13:00","13:00-14:00","13:20-14:10"],
    "Mar": ["08:00-08:50","08:50-09:45","09:45-10:40","10:40-11:35","11:35-12:30","12:30-13:20","13:20-14:10"],
    "Mer": ["08:00-08:50","08:50-09:45","09:45-10:40","10:40-11:35","11:35-12:30","12:30-13:20","13:20-14:10"],
    "Gio": ["08:00-08:50","08:50-09:45","09:45-10:40","10:40-11:35","11:35-12:30","12:30-13:20","13:20-14:10"],
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
        
        // Popola statistiche
        document.getElementById('statDocenti').textContent = docentiSet.size;
        document.getElementById('statClassi').textContent = classiSet.size;
        document.getElementById('statAule').textContent = aulaSet.size;
        document.getElementById('statLezioni').textContent = data.filter(item => item.Descrizione && item.Descrizione !== 'nan').length;

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

                    return `
                        <tr>
                            <td class="cella-classe">${item.Classe}</td>
                            ${!adessoMode ? `<td>${item.Giorno}</td>` : ''}
                            <td>${item.Ora}ª</td>
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
            table += `<td class="${lezioni.length > 0 ? 'lezione-attiva' : 'libero'}">`;
            
            if (lezioni.length > 0) {
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
  const giorno = data.getDay(); // 0=domenica, 6=sabato
  const ore = data.getHours();
  const minuti = data.getMinutes();
  const minutiTotali = ore * 60 + minuti;
  
  if (giorno === 0 || giorno === 6) {
    return { testo: '📅 Weekend', fuori: true };
  }
  
  const orari = [
    { inizio: 8 * 60, fine: 8 * 60 + 50, ora: 1 },
    { inizio: 8 * 60 + 50, fine: 9 * 60 + 40, ora: 2 },
    { inizio: 9 * 60 + 40, fine: 10 * 60 + 30, ora: 3 },
    { inizio: 10 * 60 + 40, fine: 11 * 60 + 30, ora: 4 },
    { inizio: 11 * 60 + 30, fine: 12 * 60 + 20, ora: 5 },
    { inizio: 12 * 60 + 20, fine: 13 * 60 + 10, ora: 6 },
    { inizio: 13 * 60 + 10, fine: 14 * 60, ora: 7 }
  ];
  
  if (minutiTotali < orari[0].inizio) {
    const minutiMancanti = orari[0].inizio - minutiTotali;
    return { testo: `⏰ Inizio tra ${minutiMancanti} min`, fuori: true };
  }
  
  for (let i = 0; i < orari.length; i++) {
    const slot = orari[i];
    if (minutiTotali >= slot.inizio && minutiTotali < slot.fine) {
      const minutiRimasti = slot.fine - minutiTotali;
      return { testo: `📚 ${slot.ora}ª ora (${minutiRimasti} min)`, fuori: false };
    }
    if (i < orari.length - 1 && minutiTotali >= slot.fine && minutiTotali < orari[i + 1].inizio) {
      return { testo: `☕ Intervallo`, fuori: true };
    }
  }
  return { testo: '🏠 Lezioni terminate', fuori: true };
}
function oraCorrenteScuola() {
    const giorni = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
    const oggi = new Date();
    const giorno = giorni[oggi.getDay()];
    const ora = oggi.getHours(), min = oggi.getMinutes();
    let intervalli = orari_scuola[giorno];
    if(!intervalli) return null;
    for(let i=0; i<intervalli.length; i++) {
        let [start, end] = intervalli[i].split("-");
        let [sH, sM] = start.split(":").map(Number);
        let [eH, eM] = end.split(":").map(Number);
        let nowMinuti = ora * 60 + min;
        let sMinuti = sH * 60 + sM;
        let eMinuti = eH * 60 + eM;
        if(nowMinuti >= sMinuti && nowMinuti < eMinuti) return (i+1).toString();
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

/* ============================
   DARK MODE (IIFE) - mantiene funzionalità e localStorage
   ============================ */
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

