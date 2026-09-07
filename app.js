const defaultWaveImage = 'wave.svg';

const cancion = document.createElement('audio');
document.body.appendChild(cancion);

const progreso = document.getElementById('progreso');
const iconoCtrl = document.getElementById('icono-ctrl');
const btnReproducir = document.getElementById('btn-reproducir');
const btnAnterior = document.getElementById('btn-anterior');
const btnSiguiente = document.getElementById('btn-siguiente');
const btnAleatorio = document.getElementById('btn-aleatorio');
const btnRepetir = document.getElementById('btn-repetir');

const tituloCancion = document.getElementById('titulo-cancion');
const artistaCancion = document.getElementById('artista-cancion');
const contador = document.getElementById('contador');
const imagenCaratula = document.getElementById('imagen-caratula');

const tiempoActualElemento = document.getElementById('tiempo-actual');
const tiempoTotalElemento = document.getElementById('tiempo-total');

const inputVolumen = document.getElementById('volumen');
const iconoVolumen = document.getElementById('icono-volumen');
const inputCargarCarpeta = document.getElementById('cargar-carpeta');

const inputBuscador = document.getElementById('buscador');
const listaResultados = document.getElementById('lista-resultados');
const playlistUI = document.getElementById('lista-canciones');

const contenedorFiltroCarpeta = document.getElementById('contenedor-filtro-carpeta');
const selectCarpeta = document.getElementById('select-carpeta');

// Referencias para el Menú y Modal de Lista Negra
let listaNegra = JSON.parse(localStorage.getItem('listaNegra')) || [];
const btnMenuListaNegra = document.getElementById('btn-menu-lista-negra');
const menuDesplegableLN = document.getElementById('menu-desplegable-ln');
const btnAgregarLN = document.getElementById('btn-agregar-ln');
const btnVerLN = document.getElementById('btn-ver-ln');
const modalVerListaNegra = document.getElementById('modal-ver-lista-negra');
const btnCerrarModalLN = document.getElementById('btn-cerrar-modal-ln');
const listaNegraElementosUI = document.getElementById('lista-negra-elementos');

// Referencias para el Modal de Letras
const btnVerLetra = document.getElementById('btn-ver-letra');
const modalLetra = document.getElementById('modal-letra');
const btnCerrarModalLetra = document.getElementById('btn-cerrar-modal-letra');
const textareaLetra = document.getElementById('texto-letra');
const btnGuardarLetra = document.getElementById('btn-guardar-letra');

const vistaReproductor = document.getElementById('vista-reproductor');
const vistaEcualizador = document.getElementById('vista-ecualizador');
const btnIrEcualizador = document.getElementById('btn-ir-ecualizador');
const btnVolverReproductor = document.getElementById('btn-volver-reproductor');

const btnTemporizador = document.getElementById('btn-temporizador');
const textoTemporizador = document.getElementById('texto-temporizador');
const modalTemporizador = document.getElementById('modal-temporizador');
const btnCancelarModal = document.getElementById('btn-cancelar-modal');
const btnIniciarTemporizador = document.getElementById('btn-iniciar-temporizador');
const inputMinutos = document.getElementById('minutos-temporizador');

const tarjetaReproductor = document.querySelector('.contenedor-reproductor');

let todasLasCanciones = [];
let listaCanciones = [];
let indiceActual = 0;
let esAleatorio = false;
let esRepetir = false;
let urlBlobActual = null;

let idTemporizador = null;
let idIntervaloConteo = null;
let tiempoRestanteSegundos = 0;
let modoApagado = 'inmediato';
let temporizadorExpirado = false;

// Web Audio API
let audioCtx = null;
let trackSource = null;
let eqNodes = [];
let eqPowerSwitch = document.getElementById('eq-power');
let selectPreset = document.getElementById('select-preset');
let bassBoostInput = document.getElementById('eq-bass-extra');

const FRECUENCIAS = [60, 230, 910, 4000, 14000];
const PRESETS = {
    flat: [0, 0, 0, 0, 0],
    bass: [8, 5, 0, 0, -2],
    rock: [5, 3, -1, 3, 5],
    pop: [-1, 2, 5, 1, -2],
    techno: [6, 4, 0, 3, 5],
    vocal: [-3, 2, 6, 4, -2]
};

// ** GESTIÓN DE INDEXEDDB PARA PERSISTENCIA DE MÚSICA, LETRAS Y CARÁTULAS EN BASE64 **
function guardarCancionesEnDB(canciones) {
    const request = indexedDB.open("ReproductorDB", 3);
    
    request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("archivos")) {
            db.createObjectStore("archivos", { autoIncrement: true });
        }
    };

    request.onsuccess = (e) => {
        const db = e.target.result;
        const transaction = db.transaction("archivos", "readwrite");
        const store = transaction.objectStore("archivos");
        
        store.clear();
        canciones.forEach(c => {
            store.add({ 
                archivo: c.archivo, 
                subcarpeta: c.subcarpeta, 
                metadata: { 
                    titulo: c.titulo, 
                    artista: c.artista, 
                    caratula: c.caratula, // Guardamos la URL en Base64 o default directamente
                    letra: c.letra || "" 
                } 
            });
        });
    };
}

function cargarCancionesDeDB(callback) {
    const request = indexedDB.open("ReproductorDB", 3);
    
    request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("archivos")) {
            db.createObjectStore("archivos", { autoIncrement: true });
        }
    };

    request.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("archivos")) return;
        
        const transaction = db.transaction("archivos", "readonly");
        const store = transaction.objectStore("archivos");
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
            const resultados = getAllRequest.result;
            if (resultados && resultados.length > 0) {
                const cancionesRestauradas = resultados.map(item => ({
                    archivo: item.archivo,
                    subcarpeta: item.subcarpeta,
                    titulo: item.metadata.titulo,
                    artista: item.metadata.artista,
                    caratula: item.metadata.caratula || defaultWaveImage,
                    letra: item.metadata.letra || ""
                }));
                callback(cancionesRestauradas);
            }
        };
    };
}

// ** LÓGICA DE LISTA NEGRA: Menú Desplegable y Opciones **
if (btnMenuListaNegra && menuDesplegableLN) {
    btnMenuListaNegra.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDesplegableLN.classList.toggle('oculto');
    });

    document.addEventListener('click', () => {
        menuDesplegableLN.classList.add('oculto');
    });
}

if (btnAgregarLN) {
    btnAgregarLN.addEventListener('click', () => {
        menuDesplegableLN.classList.add('oculto');
        if (listaCanciones.length === 0) {
            alert("No hay ninguna canción reproduciéndose.");
            return;
        }

        const cancionActualItem = listaCanciones[indiceActual];
        const nombreArchivo = cancionActualItem.archivo.name;

        if (!listaNegra.includes(nombreArchivo)) {
            listaNegra.push(nombreArchivo);
            localStorage.setItem('listaNegra', JSON.stringify(listaNegra));
            alert(`"${cancionActualItem.titulo}" se añadió a la lista negra.`);
            
            todasLasCanciones = todasLasCanciones.filter(c => c.archivo.name !== nombreArchivo);
            listaCanciones = listaCanciones.filter(c => c.archivo.name !== nombreArchivo);
            
            guardarCancionesEnDB(todasLasCanciones);
            renderizarLista();

            if (listaCanciones.length > 0) {
                indiceActual = indiceActual % listaCanciones.length;
                cargarCancion(indiceActual);
            } else {
                pausarCancion();
                tituloCancion.textContent = "Sin canciones";
                artistaCancion.textContent = "Carpeta limpia";
                imagenCaratula.src = defaultWaveImage;
                progreso.value = 0;
            }
        } else {
            alert("Esta canción ya está en la lista negra.");
        }
    });
}

if (btnVerLN && modalVerListaNegra) {
    btnVerLN.addEventListener('click', () => {
        menuDesplegableLN.classList.add('oculto');
        renderizarModalListaNegra();
        modalVerListaNegra.classList.remove('oculto');
    });

    btnCerrarModalLN.addEventListener('click', () => {
        modalVerListaNegra.classList.add('oculto');
    });
}

function renderizarModalListaNegra() {
    listaNegraElementosUI.innerHTML = '';
    if (listaNegra.length === 0) {
        listaNegraElementosUI.innerHTML = '<li style="justify-content: center; color: #777;">La lista negra está vacía</li>';
        return;
    }

    listaNegra.forEach((nombreArchivo) => {
        const li = document.createElement('li');
        const textoMostrar = nombreArchivo.length > 25 ? nombreArchivo.substring(0, 22) + '...' : nombreArchivo;
        
        li.innerHTML = `
            <span title="${nombreArchivo}">${textoMostrar}</span>
            <button class="btn-quitar-ln">Quitar</button>
        `;

        li.querySelector('.btn-quitar-ln').addEventListener('click', () => {
            quitarDeListaNegra(nombreArchivo);
        });

        listaNegraElementosUI.appendChild(li);
    });
}

function quitarDeListaNegra(nombreArchivo) {
    listaNegra = listaNegra.filter(nombre => nombre !== nombreArchivo);
    localStorage.setItem('listaNegra', JSON.stringify(listaNegra));
    renderizarModalListaNegra();
    alert(`"${nombreArchivo}" ha sido retirada de la lista negra.`);
}

// ** LÓGICA DE LETRAS DE CANCIONES **
if (btnVerLetra && modalLetra) {
    btnVerLetra.addEventListener('click', () => {
        if (listaCanciones.length === 0) {
            alert("No hay ninguna canción reproduciéndose.");
            return;
        }
        const cancionActual = listaCanciones[indiceActual];
        textareaLetra.value = cancionActual.letra || "";
        modalLetra.classList.remove('oculto');
    });

    btnCerrarModalLetra.addEventListener('click', () => {
        modalLetra.classList.add('oculto');
    });

    btnGuardarLetra.addEventListener('click', () => {
        if (listaCanciones.length === 0) return;
        
        const cancionActual = listaCanciones[indiceActual];
        cancionActual.letra = textareaLetra.value;

        const indexGlobal = todasLasCanciones.findIndex(c => c.archivo.name === cancionActual.archivo.name);
        if (indexGlobal !== -1) {
            todasLasCanciones[indexGlobal].letra = cancionActual.letra;
        }

        guardarCancionesEnDB(todasLasCanciones);

        alert("Letra guardada correctamente.");
        modalLetra.classList.add('oculto');
    });
}

function inicializarAudioContext() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    trackSource = audioCtx.createMediaElementSource(cancion);

    let nodoAnterior = trackSource;
    FRECUENCIAS.forEach((freq) => {
        const filter = audioCtx.createBiquadFilter();
        if (freq === 60) filter.type = 'lowshelf';
        else if (freq === 14000) filter.type = 'highshelf';
        else {
            filter.type = 'peaking';
            filter.Q.value = 1;
        }
        filter.frequency.value = freq;
        filter.gain.value = 0;

        nodoAnterior.connect(filter);
        nodoAnterior = filter;
        eqNodes.push(filter);
    });
    nodoAnterior.connect(audioCtx.destination);
}

document.querySelectorAll('.eq-banda').forEach((slider, index) => {
    slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        document.getElementById(`val-${FRECUENCIAS[index]}`).textContent = `${val > 0 ? '+' : ''}${val}dB`;
        if (eqPowerSwitch && eqPowerSwitch.checked && eqNodes[index]) {
            eqNodes[index].gain.value = val;
        }
    });
});

if (selectPreset) {
    selectPreset.addEventListener('change', (e) => {
        const preset = PRESETS[e.target.value];
        if (!preset) return;
        const sliders = document.querySelectorAll('.eq-banda');
        sliders.forEach((slider, index) => {
            slider.value = preset[index];
            document.getElementById(`val-${FRECUENCIAS[index]}`).textContent = `${preset[index] > 0 ? '+' : ''}${preset[index]}dB`;
            if (eqPowerSwitch && eqPowerSwitch.checked && eqNodes[index]) {
                eqNodes[index].gain.value = preset[index];
            }
        });
    });
}

if (eqPowerSwitch) {
    eqPowerSwitch.addEventListener('change', (e) => {
        const activo = e.target.checked;
        const sliders = document.querySelectorAll('.eq-banda');
        eqNodes.forEach((node, index) => {
            node.gain.value = activo ? parseFloat(sliders[index].value) : 0;
        });
    });
}

if (bassBoostInput) {
    bassBoostInput.addEventListener('input', (e) => {
        if (!eqPowerSwitch || !eqPowerSwitch.checked || !eqNodes[0]) return;
        const boost = parseFloat(e.target.value);
        const baseVal = parseFloat(document.querySelectorAll('.eq-banda')[0].value);
        eqNodes[0].gain.value = baseVal + boost;
    });
}

if (btnIrEcualizador && btnVolverReproductor) {
    btnIrEcualizador.addEventListener('click', () => {
        vistaReproductor.classList.add('oculto');
        vistaEcualizador.classList.remove('oculto');
    });
    btnVolverReproductor.addEventListener('click', () => {
        vistaEcualizador.classList.add('oculto');
        vistaReproductor.classList.remove('oculto');
    });
}

function formatearTiempo(segundos) {
    if (isNaN(segundos) || segundos <= 0) return '0:00';
    const minutos = Math.floor(segundos / 60);
    const segsRestantes = Math.floor(segundos % 60);
    return `${minutos}:${segsRestantes < 10 ? '0' : ''}${segsRestantes}`;
}

async function obtenerMetadatos(archivo) {
    try {
        const metadata = await window.musicMetadata.parseBlob(archivo);
        const common = metadata.common;
        let coverUrl = defaultWaveImage;

        if (common.picture && common.picture.length > 0) {
            const pic = common.picture[0];
            let binary = '';
            const bytes = new Uint8Array(pic.data);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64String = window.btoa(binary);
            coverUrl = `data:${pic.format};base64,${base64String}`;
        }

        let letraExtraida = "";
        if (common.lyrics && common.lyrics.length > 0) {
            letraExtraida = typeof common.lyrics[0] === 'string' ? common.lyrics[0] : common.lyrics[0].text;
        }

        return {
            titulo: common.title || archivo.name.replace(/\.[^/.]+$/, ""),
            artista: common.artist || "Artista desconocido",
            caratula: coverUrl,
            letra: letraExtraida || ""
        };
    } catch (e) {
        return {
            titulo: archivo.name.replace(/\.[^/.]+$/, ""),
            artista: "Artista desconocido",
            caratula: defaultWaveImage,
            letra: ""
        };
    }
}

inputCargarCarpeta.addEventListener('change', async (e) => {
    const archivosRaw = Array.from(e.target.files).filter(archivo =>
        archivo.type.startsWith('audio/') && !listaNegra.includes(archivo.name)
    );

    if (archivosRaw.length === 0) {
        alert("No se encontraron archivos de audio válidos.");
        return;
    }

    todasLasCanciones = [];
    listaCanciones = [];
    playlistUI.innerHTML = "";
    pausarCancion();
    
    artistaCancion.textContent = "Cargando...";
    tituloCancion.textContent = "Procesando carpeta...";

    const subcarpetas = new Set();
    for (const [index, archivo] of archivosRaw.entries()) {
        artistaCancion.textContent = `Cargando ${index + 1} de ${archivosRaw.length}...`;
        const metadata = await obtenerMetadatos(archivo);
        
        const rutaRelativa = archivo.webkitRelativePath || archivo.name;
        const partesRuta = rutaRelativa.split('/');
        let nombreSubcarpeta = "Raíz";
        
        if (partesRuta.length > 2) {
            nombreSubcarpeta = partesRuta[1];
            subcarpetas.add(nombreSubcarpeta);
        }

        todasLasCanciones.push({ archivo, ...metadata, subcarpeta: nombreSubcarpeta });
    }

    guardarCancionesEnDB(todasLasCanciones);

    selectCarpeta.innerHTML = '<option value="todas">Todas las canciones</option>';
    if (subcarpetas.size > 0) {
        subcarpetas.forEach(carpeta => {
            const option = document.createElement('option');
            option.value = carpeta;
            option.textContent = carpeta;
            selectCarpeta.appendChild(option);
        });
        contenedorFiltroCarpeta.classList.remove('oculto');
    } else {
        contenedorFiltroCarpeta.classList.add('oculto');
    }

    filtrarPorSubcarpeta('todas');
});

selectCarpeta.addEventListener('change', (e) => {
    filtrarPorSubcarpeta(e.target.value);
});

function filtrarPorSubcarpeta(categoria) {
    if (categoria === 'todas') {
        listaCanciones = [...todasLasCanciones];
    } else {
        listaCanciones = todasLasCanciones.filter(c => c.subcarpeta === categoria);
    }
    renderizarLista();
    if (listaCanciones.length > 0) {
        indiceActual = 0;
        cargarCancion(indiceActual);
    }
}

function renderizarLista() {
    playlistUI.innerHTML = "";
    listaCanciones.forEach((cancionItem, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="miniatura">
                <img src="${cancionItem.caratula}" alt="Carátula">
            </div>
            <div class="info-cancion-lista">
                <p class="titulo">${cancionItem.titulo}</p>
                <p class="artista">${cancionItem.artista}</p>
            </div>
        `;
        li.onclick = () => cargarCancion(index);
        playlistUI.appendChild(li);
    });
}

function cargarCancion(indice) {
    if (listaCanciones.length === 0) return;
    if (urlBlobActual) URL.revokeObjectURL(urlBlobActual);

    const cancionActual = listaCanciones[indice];
    urlBlobActual = URL.createObjectURL(cancionActual.archivo);
    cancion.src = urlBlobActual;

    tituloCancion.textContent = cancionActual.titulo;
    artistaCancion.textContent = cancionActual.artista;
    imagenCaratula.src = cancionActual.caratula;
    contador.textContent = `${indice + 1} / ${listaCanciones.length}`;

    progreso.value = 0;
    tiempoActualElemento.textContent = '0:00';
    tiempoTotalElemento.textContent = '0:00';

    const itemsLista = playlistUI.querySelectorAll('li');
    itemsLista.forEach((item, i) => item.classList.toggle('active', i === indice));

    configurarMediaSession(cancionActual);
    reproducirCancion();
}

function configurarMediaSession(cancionActual) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: cancionActual.titulo,
            artist: cancionActual.artista,
            artwork: [{ src: cancionActual.caratula, sizes: '512x512', type: 'image/png' }]
        });
        navigator.mediaSession.setActionHandler('play', reproducirCancion);
        navigator.mediaSession.setActionHandler('pause', pausarCancion);
        navigator.mediaSession.setActionHandler('previoustrack', () => btnAnterior.click());
        navigator.mediaSession.setActionHandler('nexttrack', siguienteCancion);
    }
}

function reproducirCancion() {
    inicializarAudioContext();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    cancion.play().catch(error => console.error("Error reproduciendo:", error));
    iconoCtrl.classList.remove('fa-play');
    iconoCtrl.classList.add('fa-pause');
    tarjetaReproductor.classList.add('reproduciendo');
}

function pausarCancion() {
    cancion.pause();
    iconoCtrl.classList.remove('fa-pause');
    iconoCtrl.classList.add('fa-play');
    tarjetaReproductor.classList.remove('reproduciendo');
}

btnReproducir.addEventListener('click', () => {
    if (listaCanciones.length === 0) return;
    cancion.paused ? reproducirCancion() : pausarCancion();
});

btnSiguiente.addEventListener('click', siguienteCancion);

function siguienteCancion() {
    if (listaCanciones.length === 0) return;
    if (temporizadorExpirado && modoApagado === 'al_finalizar') {
        pausarCancion();
        cancelarTemporizador();
        return;
    }
    indiceActual = esAleatorio ? Math.floor(Math.random() * listaCanciones.length) : (indiceActual + 1) % listaCanciones.length;
    cargarCancion(indiceActual);
}

btnAnterior.addEventListener('click', () => {
    if (listaCanciones.length === 0) return;
    indiceActual = esAleatorio ? Math.floor(Math.random() * listaCanciones.length) : (indiceActual - 1 + listaCanciones.length) % listaCanciones.length;
    cargarCancion(indiceActual);
});

btnAleatorio.addEventListener('click', () => {
    esAleatorio = !esAleatorio;
    btnAleatorio.classList.toggle('activo', esAleatorio);
});

btnRepetir.addEventListener('click', () => {
    esRepetir = !esRepetir;
    btnRepetir.classList.toggle('activo', esRepetir);
});

cancion.addEventListener('loadedmetadata', () => {
    progreso.max = cancion.duration;
    tiempoTotalElemento.textContent = formatearTiempo(cancion.duration);
});

cancion.addEventListener('timeupdate', () => {
    if (!cancion.paused && cancion.duration) {
        progreso.value = cancion.currentTime;
        tiempoActualElemento.textContent = formatearTiempo(cancion.currentTime);
    }
});

progreso.addEventListener('input', () => {
    cancion.currentTime = progreso.value;
    tiempoActualElemento.textContent = formatearTiempo(progreso.value);
});

cancion.addEventListener('ended', () => {
    if (temporizadorExpirado && modoApagado === 'al_finalizar') {
        pausarCancion();
        cancelarTemporizador();
    } else if (esRepetir) {
        reproducirCancion();
    } else {
        siguienteCancion();
    }
});

inputVolumen.addEventListener('input', (e) => {
    cancion.volume = e.target.value;
    actualizarIconoVolumen(e.target.value);
});

function actualizarIconoVolumen(valor) {
    iconoVolumen.className = 'fa-solid ';
    if (valor == 0) iconoVolumen.classList.add('fa-volume-xmark');
    else if (valor < 0.5) iconoVolumen.classList.add('fa-volume-low');
    else iconoVolumen.classList.add('fa-volume-high');
}

inputBuscador.addEventListener('input', (e) => {
    const texto = e.target.value.toLowerCase().trim();
    listaResultados.innerHTML = '';
    if (texto === '' || listaCanciones.length === 0) {
        listaResultados.classList.add('oculto');
        return;
    }
    const resultados = listaCanciones.map((c, index) => ({ c, index })).filter(item => item.c.titulo.toLowerCase().includes(texto));
    if (resultados.length > 0) {
        resultados.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.c.titulo;
            li.addEventListener('click', () => {
                cargarCancion(item.index);
                listaResultados.classList.add('oculto');
                inputBuscador.value = '';
            });
            listaResultados.appendChild(li);
        });
        listaResultados.classList.remove('oculto');
    } else {
        listaResultados.classList.add('oculto');
    }
});

document.addEventListener('click', (e) => {
    if (!inputBuscador.contains(e.target) && !listaResultados.contains(e.target)) {
        listaResultados.classList.add('oculto');
    }
});

btnTemporizador.addEventListener('click', () => {
    idIntervaloConteo ? cancelarTemporizador() : modalTemporizador.classList.remove('oculto');
});

btnCancelarModal.addEventListener('click', () => modalTemporizador.classList.add('oculto'));

btnIniciarTemporizador.addEventListener('click', () => {
    const minutos = parseInt(inputMinutos.value);
    if (isNaN(minutos) || minutos <= 0) return;

    const radiosModo = document.getElementsByName('modo-apagado');
    for (const radio of radiosModo) {
        if (radio.checked) {
            modoApagado = radio.value;
            break;
        }
    }

    tiempoRestanteSegundos = minutos * 60;
    temporizadorExpirado = false;
    modalTemporizador.classList.add('oculto');
    btnTemporizador.classList.add('activo');

    actualizarEtiquetaTemporizador();
    clearInterval(idIntervaloConteo);
    clearTimeout(idTemporizador);

    idIntervaloConteo = setInterval(() => {
        tiempoRestanteSegundos--;
        actualizarEtiquetaTemporizador();
        if (tiempoRestanteSegundos <= 0) {
            clearInterval(idIntervaloConteo);
            ejecutarApagado();
        }
    }, 1000);
});

function actualizarEtiquetaTemporizador() {
    textoTemporizador.textContent = formatearTiempo(tiempoRestanteSegundos);
}

function ejecutarApagado() {
    temporizadorExpirado = true;
    if (modoApagado === 'inmediato') {
        pausarCancion();
        cancelarTemporizador();
    } else {
        textoTemporizador.textContent = "Al terminar pista";
    }
}

function cancelarTemporizador() {
    clearTimeout(idTemporizador);
    clearInterval(idIntervaloConteo);
    idTemporizador = null;
    idIntervaloConteo = null;
    temporizadorExpirado = false;
    btnTemporizador.classList.remove('activo');
    textoTemporizador.textContent = 'Temporizador';
}

// ** INICIO AUTOMÁTICO AL CARGAR LA PÁGINA (RECUPERA MÚSICA Y LETRAS DE INDEXEDDB) **
window.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash-screen');
    const player = document.getElementById('player');

    cargarCancionesDeDB((cancionesRestauradas) => {
        todasLasCanciones = cancionesRestauradas.filter(c => !listaNegra.includes(c.archivo.name));
        
        const subcarpetas = new Set();
        todasLasCanciones.forEach(c => {
            if (c.subcarpeta && c.subcarpeta !== "Raíz") subcarpetas.add(c.subcarpeta);
        });

        if (subcarpetas.size > 0) {
            selectCarpeta.innerHTML = '<option value="todas">Todas las canciones</option>';
            subcarpetas.forEach(carpeta => {
                const option = document.createElement('option');
                option.value = carpeta;
                option.textContent = carpeta;
                selectCarpeta.appendChild(option);
            });
            contenedorFiltroCarpeta.classList.remove('oculto');
        } else {
            contenedorFiltroCarpeta.classList.add('oculto');
        }

        if (todasLasCanciones.length > 0) {
            filtrarPorSubcarpeta('todas');
        }
    });

    setTimeout(() => {
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                if (player) player.classList.remove('hidden');
            }, 600);
        }
    }, 2500);
});
