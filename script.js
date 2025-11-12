let orario = null;
let docentiSet = new Set(), aulaSet = new Set(), classiSet = new Set();
let currentPage = 1;
const resultsPerPage = 5;

window.vaiPagina = function(page) {
    currentPage = page;
    cerca();
};

window.resetFiltri = function() {
    currentPage = 1;
    mostraHome();
};

/* === FUNZIONI DI ESTRAZIONE === */
function estraiDocenti(desc) {
    // Prende solo i docenti dalla prima parentesi tonda
    let match = desc.match(/\(([^()]*)\)/);
    if (match && match[1]) {
        return match[1].split(/[;,]\s*/).map(x => x.trim()).filter(x => x.length > 0);
    }
    return [];
}
function estraiAula(desc) {
    // Prende solo l'aula dalla seconda parentesi tonda (se c'è)
    let matches = desc.match(/\(([^()]*)\)/g);
    if (matches && matches.length > 1) {
        let aulaRaw = matches[1].replace(/[()]/g, '').trim();
        return aulaRaw;
    }
    return '';
}

/* === LOGICA DI BANNER E FRASI === */
function mostraBannerBenvenuto() {
    document.getElementById('banner-benvenuto').innerHTML = `<span>🎓 Benvenuto! </span>`;
}
const frasi = [
    "Seleziona i filtri sopra per cercare nell'orario scolastico.",
    "Premi <b>Vedi lezioni attive</b> per vedere le lezioni che si stanno tenendo in questo momento.",
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
    if(box.dataset.cicla) return;
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
    // Resetta i filtri
    document.getElementById('classe_select').value = "";
    document.getElementById('docente_select').value = "";
    document.getElementById('aula_select').value = "";
    document.getElementById('giorno_select').value = "";
    document.getElementById('ora_select').value = "";
}

/* === INTERVALLI ORARI === */
const orari_scuola = {
    "Lun": ["08:00-09:00","09:00-10:00","10:00-11:00","11:00-12:00","12:00-13:00","13:00-14:00","13:20-14:10"],
    "Ven": ["08:00-09:00","09:00-10:00","10:00-11:00","11:00-12:00","12:00-13:00","13:00-14:00","13:20-14:10"],
    "Mar": ["08:00-08:50","08:50-09:45","09:45-10:40","10:40-11:35","11:35-12:30","12:30-13:20","13:20-14:10"],
    "Mer": ["08:00-08:50","08:50-09:45","09:45-10:40","10:40-11:35","11:35-12:30","12:30-13:20","13:20-14:10"],
    "Gio": ["08:00-08:50","08:50-09:45","09:45-10:40","10:40-11:35","11:35-12:30","12:30-13:20","13:20-14:10"],
};

/* === POPOLAMENTO FILTRI === */
function aggiornaSelect(sel, values, placeholderText) {
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

fetch('orario_unificato.json')
    .then(resp => resp.json())
    .then(data => {
        orario = data;
        data.forEach(item => {
            classiSet.add(item.Classe);
            estraiDocenti(item.Descrizione).forEach(nome => docentiSet.add(nome));
            let aula = estraiAula(item.Descrizione);
            if(aula) aulaSet.add(aula);
        });
        aggiornaSelect(document.getElementById('classe_select'), classiSet, "Filtra per Classe...");
        aggiornaSelect(document.getElementById('docente_select'), docentiSet, "Filtra per Docente...");
        aggiornaSelect(document.getElementById('aula_select'), aulaSet, "Filtra per Aula...");
        ['classe_select','docente_select','aula_select','giorno_select','ora_select'].forEach(id => {
            document.getElementById(id).addEventListener('change', function() {
                currentPage = 1;
                cerca();
            });
        });
    })
    .catch(error => console.error('Errore nel caricamento dei dati JSON:', error));

/* === FUNZIONI DI RICERCA CENTRALE === */
function cerca() {
    document.getElementById('banner-benvenuto').style.display = "none";
    document.getElementById('banner-frasi').style.display = "none";
    document.body.classList.remove('senza-lezioni');

    const classe = document.getElementById('classe_select').value;
    const docente = document.getElementById('docente_select').value;
    const aula = document.getElementById('aula_select').value;
    const giorno = document.getElementById('giorno_select').value;
    const ora = document.getElementById('ora_select').value;

    if (!classe && !docente && !aula && !giorno && !ora) {
        mostraHome();
        return;
    }

    // Verifica che il dataset sia pronto
    if (!orario || orario.length === 0) {
        alert('Errore: dati non caricati.');
        return;
    }

    let vistaGriglia = false, tipoGriglia = '';
    if (classe && !docente && !aula && !giorno && !ora) {
        vistaGriglia = true;
        tipoGriglia = 'classe';
    } else if (docente && !classe && !aula && !giorno && !ora) {
        vistaGriglia = true;
        tipoGriglia = 'docente';
    }

    const boxRisultati = document.getElementById('risultati');
    boxRisultati.classList.add('risultati-nascosti');
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
            const giorni = ["Lun", "Mar", "Mer", "Gio", "Ven"];
            if (a.Giorno !== b.Giorno) {
                return giorni.indexOf(a.Giorno) - giorni.indexOf(b.Giorno);
            }
            return Number(a.Ora) - Number(b.Ora);
        });

        if (vistaGriglia) {
            mostraGrigliaOrario(risultati, tipoGriglia);
        } else {
            mostraRisultati(risultati);
        }
        boxRisultati.style.display = 'block';
        setTimeout(() => { boxRisultati.classList.remove('risultati-nascosti'); }, 30);
    }, 80);
}

function cercaAdesso() {
    document.getElementById('banner-benvenuto').style.display = "none";
    document.getElementById('banner-frasi').style.display = "none";
    document.body.classList.remove('senza-lezioni');
    const giorni = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
    const oggi = new Date();
    const giorno = giorni[oggi.getDay()];
    const ora_scuola = oraCorrenteScuola();
    currentPage = 1;
    const classe = document.getElementById('classe_select').value;
    const docente = document.getElementById('docente_select').value;
    const aula = document.getElementById('aula_select').value;
    const boxRisultati = document.getElementById('risultati');
    boxRisultati.classList.add('risultati-nascosti');
    boxRisultati.style.display = 'none';
    setTimeout(() => {
        let risultati = [];
        if (ora_scuola) {
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
        boxRisultati.style.display = 'block';
        setTimeout(() => { boxRisultati.classList.remove('risultati-nascosti'); }, 10);
    }, 50);
}

/* === MOSTRA RISULTATI (Tabella) === */
function mostraRisultati(risultati, ora_scuola = null, giorno = null, adessoMode = false){
    document.body.classList.remove('senza-lezioni');
    const box = document.getElementById('risultati');
    let pagi = "";
    let table = "";

    if(adessoMode && (!ora_scuola || ora_scuola === "" || typeof ora_scuola === "undefined" || risultati.length === 0)) {
        document.body.classList.add('senza-lezioni');
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

    const totalPages = Math.ceil(risultati.length / resultsPerPage);
    if (totalPages > 1) {
        pagi = generaPaginazione(currentPage, totalPages);
    }
    const start = (currentPage - 1) * resultsPerPage;
    const end = start + resultsPerPage;
    const risultatiPagina = risultati.slice(start, end);

    if (risultatiPagina.length === 0 && risultati.length === 0) {
        table = `<table class="orario-tabella">
            <thead><tr><th>Classe</th><th>Giorno</th><th>Ora</th><th>Docente</th><th>Descrizione</th></tr></thead>
            <tbody><tr><td colspan="6" style="text-align:center; color:#e02538; font-size:1.16em"><em>Nessun risultato trovato.</em></td></tr></tbody>
        </table>`;
    } else {
        table = `<table class="orario-tabella">
            <thead><tr><th>Classe</th><th>Giorno</th><th>Ora</th><th>Docente</th><th>Descrizione</th></tr></thead>
            <tbody>
                ${risultatiPagina.map(item=>`
                    <tr>
                        <td>${item.Classe}</td>
                        <td>${item.Giorno}</td>
                        <td>${item.Ora}</td>
                        <td>${estraiDocenti(item.Descrizione).join(' / ')}</td>
                        <td>${item.Descrizione}</td>
                        <td>${item.Descrizione}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
    }

    let contatore = `<div class="contatore-risultati" style="text-align:left; margin-bottom:10px; font-weight:500; color:#0b4c8c;">
        Trovati ${risultati.length} risultati. ${totalPages > 1 ? `Pagina ${currentPage} di ${totalPages}.` : ''}
    </div>`;

    box.innerHTML = `<div class="tabella-e-pagine">${contatore}${pagi}<div class="contenitore-tabella">${table}</div></div>`;
}

/* === MOSTRA RISULTATI (Griglia oraria) === */
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
                    const docenteText = docentiTrovati.length > 0 ? docentiTrovati.join(' / ') : '';
                    const aulaText = estraiAula(desc);

                    // Materia (ripulita)
                    let materia = desc;
                    if(docentiTrovati.length > 0) docentiTrovati.forEach(d => materia = materia.replace(d, ''));
                    if(aulaText) materia = materia.replace(aulaText, '');
                    materia = materia.replace(/\([\s\S]*?\)/g, '');
                    materia = materia.replace(/[\(\);,]/g, '');
                    materia = materia.replace(/\s{2,}/g, ' ').replace(/\s+-\s+/g, '-').trim();

                    let contenuto = `
                        <div class="riga-materia">${materia || 'Materia non trovata'}</div>
                        ${docenteText ? `<div class="riga-docente">${docenteText}</div>` : ''}
                    `;
                    table += `<div class="cella-lezione">${contenuto}</div>`;
                });
            } else {
                table += `<span class="slot-libero">LIBERO</span>`;
            }
            table += `</td>`;
        });
        table += `</tr>`;
    });
    table += `</tbody></table>`;

    const box = document.getElementById('risultati');
    box.innerHTML = `<div class="contenitore-tabella griglia-settimanale">${table}</div>`;
    box.style.display = 'block';
    setTimeout(() => { box.classList.remove('risultati-nascosti'); }, 30);
}

/* === ORA CORRENTE === */
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

/* === PAGINAZIONE === */
function generaPaginazione(currentPage, totalPages) {
    const maxShown = 10;
    let start = Math.floor((currentPage-1) / maxShown) * maxShown + 1;
    let end = Math.min(start + maxShown - 1, totalPages);
    let pagi = `<div class="paginazione">`;

    if (start > 1) {
        pagi += `<button class="btn-pagi" onclick="window.vaiPagina(${start-1})">&laquo;</button>`;
    }
    for (let p = start; p <= end; p++) {
        const isActive = p === currentPage;
        pagi += `<button class="btn-pagi ${isActive ? 'active' : ''}" onclick="window.vaiPagina(${p})">${p}</button>`;
    }
    if (end < totalPages) {
        pagi += `<button class="btn-pagi" onclick="window.vaiPagina(${end+1})">&raquo;</button>`;
    }
    pagi += `</div>`;
    return pagi;
}

/* === AVVIO PAGINA === */
document.addEventListener('DOMContentLoaded', mostraHome);
    