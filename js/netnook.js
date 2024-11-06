// *** Global Vars ***
let iconos = [];
let isSearchMode = false;
let isAutoSeachMode = false;
let selectedPos = 0;
let filterText = '';

// global doument elements
const searchBackground = document.getElementById('backgroundOverlay')
const filtroDisplay = document.getElementById('filtro');

// Carga de catalogo desde almacenamiento local del navegador
let catalogToUse = loadCatalogFromLocal() || initialCatalog;
console.log('Bookmark list is ' + catalogToUse.length + ' items long');

// Añadir los iconos al contenedor
addIcons(catalogToUse);

if (isStandalone()) {
    console.log('Standalone Mode!');
}

function addIcons(catalog) {
    const contenedor = document.getElementById('icons');
    if (!contenedor) {
        console.error('No se encontró el contenedor con id "contenedorIconos".');
        return;
    }

    catalog.forEach(catalogItem => {
        if (catalogItem.addr === 'separator') {
            const separator = document.createElement('div');
            separator.className = 'separator';
            separator.textContent = catalogItem.name; // Agrega el nombre de la sección
            if (catalogItem.icon) {  // Si el separador tiene un icono definido
                if (catalogItem.name) {  // Añade el espacio solo si name no es vacío ni null
                    separator.innerHTML += '&nbsp;';
                }
                const icon = document.createElement('i');
                icon.className = catalogItem.icon; // Agrega la clase del icono
                separator.appendChild(icon);
            }
            contenedor.appendChild(separator);
        } else {
            const anchor = document.createElement('a');
            anchor.className = 'icono';
            anchor.href = catalogItem.addr;
            anchor.dataset.nombre = catalogItem.name;

            const icon = document.createElement('i');
            icon.className = catalogItem.icon;

            const text = document.createTextNode(`${catalogItem.name}`);

            anchor.appendChild(icon);
            anchor.appendChild(text);
            contenedor.appendChild(anchor);

            // Añadir comportamiento dinámico de enlaces para el click
            anchor.addEventListener('click', function (event) {
                handleLinkEvent(event, anchor.href);
            });

            // Añadir comportamiento dinámico de enlaces para el keydown
            anchor.addEventListener('keydown', function (event) {
                if (event.key === 'Enter') {
                    handleLinkEvent(event, anchor.href);
                }
            });
        }
    });

    // Actualiza las referencias y restablece el filtro
    iconos = document.querySelectorAll('.icono');
    destacarSeleccionado();  // Aplica el estado destacado inicial
}

function handleLinkEvent(event, href) {
    if (isStandalone()) {
        event.preventDefault();
        window.open(href, '_blank');
    }
}

function isStandalone() {
    return (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone);
}

function actualizarFiltro() {
    updateFilterDisplay();

    if (filterText === '') {
        iconos.forEach((icono) => {
            if (icono.classList.contains('discarded')) {
                icono.classList.remove('discarded');
            }
        });
        selectedPos = 0;
        destacarSeleccionado();
        return;
    }

    const regex = crearRegexDeFiltro(filterText.toLowerCase());
    let primerVisible = null;
    let primerVisibleDirecto = null;
    let primerVisibleInicio = null;

    iconos.forEach((icono, index) => {
        const nombre = icono.dataset.nombre.toLowerCase();

        if (regex.test(nombre)) {
            if (icono.classList.contains('discarded')) {
                icono.classList.remove('discarded');
            }

            // Selecciona el primer elemento que contiene el filtro directamente al principio del nombre
            if (nombre.startsWith(filterText.toLowerCase()) && primerVisibleInicio === null) {
                primerVisibleInicio = index;
            }

            // Selecciona el primer elemento que contiene el filtro como subcadena directa
            if (nombre.includes(filterText.toLowerCase()) && primerVisibleDirecto === null) {
                primerVisibleDirecto = index;
            }

            // Si no se ha encontrado un elemento con subcadena directa, selecciona el primero que cumpla el filtro
            if (primerVisible === null) {
                primerVisible = index;
            }
        } else {
            if (!icono.classList.contains('discarded')) {
                icono.classList.add('discarded');
            }
        }
    });

    // Primero si existe un elemento que empiece por el filtro entrado; de lo contrario: si existe un elemento con subcadena directa, seleccionamos el primero de ellos; en caso de no existir, usamos el primer elemento que cumpla el filtro.
    selectedPos = primerVisibleInicio ?? primerVisibleDirecto ?? primerVisible ?? null;

    // En caso de haber entrado una cadena de filtro que no se cumple en ninguno de los enlaces, se activa el modo de búsqueda automaticamente, este modo de busqueda automatica se desactiva al borrar caracteres aidel filtro y encontrar al menos un enlace que cumpla el filtro.
    if ((selectedPos === null) && (filterText.length > 1)) {
        if (!isSearchMode) {
            isAutoSeachMode = true;
            enableSearchMode();
        }
    } else {
        if (isSearchMode && isAutoSeachMode) {
            disableSearchMode();
        }
    }

    // Destacamos los enlaces según el filtro
    destacarSeleccionado();
}


// Función para convertir el filtro en una expresión regular
function crearRegexDeFiltro(filtro) {
    const filtroLower = filtro.toLowerCase();
    const regexString = filtroLower.split('').map(char => `.*${char}`).join('');
    return new RegExp(regexString, 'i');
}

function destacarSeleccionado() {
    iconos.forEach((icono, index) => {
        if (index === selectedPos) {
            icono.classList.add('focused');
            icono.focus(); // Asegura que el elemento seleccionado tenga el foco
        } else {
            icono.classList.remove('focused');
        }
    });
}

function abrirEnlaceSeleccionado() {
    const enlace = iconos[selectedPos].getAttribute('href');
    window.open(enlace, '_self'); // Abre el enlace en la ventana actual
}

function googleSearch() {
    const url = `https://www.google.com/search?q=${encodeURIComponent(filterText)}`;
    window.open(url, '_self');
}

//--- Functions for Filter/Search visualization

function updateFilterDisplay() {
    filtroDisplay.textContent = filterText;

    if (isSearchMode) {
        filtroDisplay.style.visibility = 'visible';
    } else {
        filtroDisplay.style.visibility = filterText ? 'visible' : 'hidden';
    }
}

// Activa el modo de búsqueda
function enableSearchMode() {
    isSearchMode = true;
    filtroDisplay.classList.add('search-modal');
    searchBackground.style.visibility = 'visible';
    updateFilterDisplay();
}

// Desactiva el modo de búsqueda
function disableSearchMode() {
    isSearchMode = false;
    isAutoSeachMode = false;
    filtroDisplay.classList.remove('search-modal');
    searchBackground.style.visibility = 'hidden';
    updateFilterDisplay();
}

//--- Functions for Download/Upload the Catalog

function downloadSettings() {
    const data = {
        bookmarks: catalogToUse
    };

    // Convertir el objeto a una cadena JSON y crear el enlace de descarga
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "bookmarks_netnook.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// Función para manejar la carga de archivo JSON de configuración
function uploadSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = event => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = e => {
            const data = JSON.parse(e.target.result);
            if (data.bookmarks) {
                saveCatalogToLocal(data.bookmarks);  // Guarda el catálogo en el almacenamiento local
                document.getElementById('icons').innerHTML = '';  // Limpia el contenedor de iconos
                addIcons(data.bookmarks);  // Añade los iconos desde el archivo subido
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

//--- Functions for Save/Load the catalog to/from LocalStorage

function saveCatalogToLocal(catalog) {
    localStorage.setItem('userCatalog', JSON.stringify(catalog));
}

function loadCatalogFromLocal() {
    const savedCatalog = localStorage.getItem('userCatalog');
    return savedCatalog ? JSON.parse(savedCatalog) : null;
}

//--- Events de menu-actions

document.getElementById('downloadIcon').addEventListener('click', downloadSettings);
document.getElementById('uploadIcon').addEventListener('click', uploadSettings);

//--- Event Listeners

// Evento de teclado modificado para activar la ventana de búsqueda con '/'
document.addEventListener('keydown', (e) => {
    // No interceptar las combinaciones con Ctrl (que no sea Backspace), Super/Meta o Alt.
    if (e.altKey || e.metaKey || (e.ctrlKey && e.key !== 'Backspace')) {
        return;
    };
    // Tratamiento de teclas sin ctrl, ni alt, ni meta (excepto Ctrl+Backspace)
    if ((e.key === '/') && !isSearchMode) {
        e.preventDefault();
        enableSearchMode();
    } else if (e.key === 'Enter') {
        if (isSearchMode) {
            e.preventDefault();
            googleSearch(); // Realiza la búsqueda en Google
        } else {
            e.preventDefault();
            abrirEnlaceSeleccionado();
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        filterText = '';
        if (isSearchMode) {
            disableSearchMode();
        }
        actualizarFiltro();
    } else if (e.key.length === 1) {
        filterText += e.key;
        actualizarFiltro();
    } else if (e.key === 'Backspace') {
        e.preventDefault();
        filterText = e.ctrlKey ? '' : filterText.slice(0, -1);
        actualizarFiltro();
    } else if ((e.key === 'ArrowRight') || ((e.key === 'Tab') && (!e.shiftKey))) {
        e.preventDefault();
        if (!isSearchMode && (selectedPos !== null)) {
            do {
                selectedPos = (selectedPos + 1) % iconos.length;
            } while (iconos[selectedPos].classList.contains('discarded'));
            destacarSeleccionado();
        }
    } else if ((e.key === 'ArrowLeft') || ((e.key === 'Tab') && (e.shiftKey))) {
        e.preventDefault();
        if (!isSearchMode && (selectedPos !== null)) {
            do {
                selectedPos = (selectedPos - 1 + iconos.length) % iconos.length;
            } while (iconos[selectedPos].classList.contains('discarded'));
            destacarSeleccionado();
        }
    } else if (e.ctrlKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        filterText = '';
        actualizarFiltro();
    }
});