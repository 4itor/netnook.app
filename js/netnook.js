// *** Global Vars ***
let elements = [];
let isSearchMode = false;
let isAutoSeachMode = false;
let selectedPos = null;
let filterText = '';
let cursorPos = 0;
let isEditMode = false;
let isEditDialogOpen = false;
let editTarget = null;
let UnsavedChanges = false;

// global doument elements
const searchBackground = document.getElementById('backgroundOverlay')
const filtroDisplay = document.getElementById('filtro');
const settingsIcon = document.getElementById('settingsIcon');
const editDialog = document.getElementById('editDialog');
const editForm = document.getElementById('editForm');
const editFormAddress = document.getElementById('editFormAddress');
const saveEditButton = document.getElementById('saveEdit');
const cancelEditButton = document.getElementById('cancelEdit');
const contenedor = document.getElementById('icons');

// Allowed Ctrl keys
const managedCtrlKeys = new Set(['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'v', 'V']);

// Url detection RegEx
const dominioRegex = new RegExp(
    `^(?:[a-z0-9]+\\.)*[a-z0-9]+\\.[a-z]{2,63}(?::\\d{1,5})?(?:/.*)?$`, "i"
);

// Carga de catalogo desde almacenamiento local del navegador
let catalogToUse = loadCatalogFromLocal() || initialCatalog;
console.log('Bookmark list is ' + catalogToUse.length + ' items long');

// Añadir los iconos al contenedor
populateCatalog(catalogToUse);

if (isStandalone()) {
    console.log('Standalone Mode!');
}

function addSeparator(catalogItem, position = null) {
    // Crear separador como un div
    const separator = document.createElement('div');
    separator.className = 'separator discarded';
    separator.dataset.nombre = catalogItem.name;
    separator.textContent = catalogItem.name || '';

    if (catalogItem.icon) {
        const icon = document.createElement('i');
        icon.className = catalogItem.icon;
        separator.appendChild(icon);
    }

    // Insertar en la posición especificada o al final
    if (position !== null && contenedor.children[position]) {
        contenedor.insertBefore(separator, contenedor.children[position]);
    } else {
        contenedor.appendChild(separator);
    }

    // Añadir comportamiento dinámico de enlaces para el click
    separator.addEventListener('click', function (event) {
        handleLinkEvent(event, '');
    });
}


function addLink(catalogItem, position = null) {
    // Crear ícono como un enlace
    const anchor = document.createElement('a');
    anchor.className = 'icono';
    anchor.href = catalogItem.addr;
    anchor.dataset.nombre = catalogItem.name;

    const icon = document.createElement('i');
    icon.className = catalogItem.icon;
    const text = document.createTextNode(catalogItem.name);

    anchor.appendChild(icon);
    anchor.appendChild(text);

    // Insertar en la posición especificada o al final
    if (position !== null && contenedor.children[position]) {
        contenedor.insertBefore(anchor, contenedor.children[position]);
    } else {
        contenedor.appendChild(anchor);
    }

    // Añadir comportamiento dinámico de enlaces para el click
    anchor.addEventListener('click', function (event) {
        handleLinkEvent(event, anchor.href);
    });
}


function populateCatalog(catalog) {
    // Limpiar el contenedor antes de regenerar los íconos
    contenedor.innerHTML = '';

    catalog.forEach(catalogItem => {
        if (catalogItem.addr === 'separator') {
            addSeparator(catalogItem);
        } else {
            addLink(catalogItem);
        }
    });

    // Actualiza las referencias y restablece el filtro
    elements = Array.from(contenedor.children);
    destacarSeleccionado();  // Aplica el estado destacado inicial
}

function handleLinkEvent(event, href) {
    if (isEditMode) {
        event.preventDefault(); // Anula el comportamiento por defecto del enlace
        if (isEditDialogOpen) {
            return;
        }
        const clickedIcon = event.target.closest('.icono, .separator');
        if (clickedIcon) {
            // Seleccionar el elemento clicado
            selectedPos = Array.from(elements).indexOf(clickedIcon);

            // Actualizar la selección visual
            destacarSeleccionado();
        }
    } else if (isStandalone()) {
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
        elements.forEach((icono) => {
            if (icono.classList.contains('discarded')) {
                icono.classList.remove('discarded');
            }
        });
        selectedPos = null;
        destacarSeleccionado();
        return;
    }

    const regex = crearRegexDeFiltro(filterText.toLowerCase());
    let primerVisible = null;
    let primerVisibleDirecto = null;
    let primerVisibleInicio = null;

    elements.forEach((icono, index) => {
        if (icono.tagName.toLowerCase() !== 'div') {
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
    console.log('Pos: ' + selectedPos)
    elements.forEach((elemento, index) => {
        if (index === selectedPos) {
            elemento.classList.add('focused');
            elemento.focus(); // Asegura que el elemento seleccionado tenga el foco
        } else {
            elemento.classList.remove('focused');
        }
    });
}

function abrirEnlaceSeleccionado() {
    const enlace = elements[selectedPos].getAttribute('href');
    window.open(enlace, '_self'); // Abre el enlace en la ventana actual
}

function googleSearch() {
    if (isValidUrl(filterText)) {
        if (!filterText.startsWith('http')) {
            filterText = 'https://' + filterText;
        }
        window.open(filterText, '_self');
    } else {
        const url = `https://www.google.com/search?q=${encodeURIComponent(filterText)}`;
        window.open(url, '_self');
    }
}

//--- Functions for Filter/Search visualization

function updateFilterDisplay() {
    // Actualiza el contenido del filtro con el cursor
    filtroDisplay.innerHTML = filterText.slice(0, cursorPos) + '\u200B<span id="cursor"></span>\u200B' + filterText.slice(cursorPos);
    if (isSearchMode) {
        updateUrlColor();
        filtroDisplay.style.visibility = 'visible';
    } else {
        filtroDisplay.style.visibility = filterText ? 'visible' : 'hidden';
    }
}

// Activa el modo de búsqueda
function enableSearchMode() {
    isSearchMode = true;
    updateUrlColor();
    filtroDisplay.classList.add('search-modal');
    searchBackground.style.visibility = 'visible';
    updateFilterDisplay();
}

// Desactiva el modo de búsqueda
function disableSearchMode() {
    isSearchMode = false;
    isAutoSeachMode = false;
    filtroDisplay.classList.remove('search-modal');
    filtroDisplay.classList.remove('valid-url');
    searchBackground.style.visibility = 'hidden';
    updateFilterDisplay();
}

function isValidUrl(texto) {
    try {
        if (dominioRegex.test(texto)) {
            texto = "https://" + texto;
        }
        new URL(texto);
        return true; // Si el constructor no lanza una excepción, es una URL válida
    } catch (e) {
        return false; // Si lanza una excepción, no es una URL válida
    }
}

function updateUrlColor() {
    if (isSearchMode) {
        if (isValidUrl(filterText)) {
            filtroDisplay.classList.add('valid-url');
        } else {
            filtroDisplay.classList.remove('valid-url');
        }
    }
}

function UpdateCursorPos() {
    filtroDisplay.style.setProperty('--char-count', cursorPos);
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
                // Añade los iconos desde el archivo subido y los muestra en pantalla
                catalogToUse = data.bookmarks;
                populateCatalog(catalogToUse);
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

//--- Función asíncrona para manejar el pegado desde el portapapeles
async function handlePaste() {
    const clipboardText = await navigator.clipboard.readText();
    enableSearchMode();
    filterText = filterText.slice(0, cursorPos) + clipboardText + filterText.slice(cursorPos);
    cursorPos += clipboardText.length;
    actualizarFiltro();
}

//--- Events de menu-actions

document.getElementById('downloadMenu').addEventListener('click', downloadSettings);
document.getElementById('uploadMenu').addEventListener('click', uploadSettings);

//--- Event Listeners

// Evento de teclado modificado para activar la ventana de búsqueda con '/'
document.addEventListener('keydown', (e) => {
    // Si tenemos abierto el dialogo de edición, no interceptar el uso de teclado
    if (isEditDialogOpen) {
        if (selectedPos !== null) {
            if (e.key === 'Escape') {
                // Deseleccionar el elemento
                e.preventDefault();
                closeEditDialog();
            }
            return;
        }
    }

    // Borrar la seleccion de texto si la hubiera
    const selection = window.getSelection();
    if (selection) {
        selection.removeAllRanges();
    }

    // Gestion de teclas en modo edicion
    if (isEditMode) {
        if (selectedPos !== null) {

            if (e.key === 'Escape') {
                // Deseleccionar el elemento
                e.preventDefault();
                selectedPos = null;
                destacarSeleccionado();
            } else if (e.key === 'e') {
                // Editar el elemento
                e.preventDefault();
                openEditDialog();
            } else if ((e.key === 'ArrowLeft') || (e.key === 'a')) {
                // Mover el elemento a la izquierda
                e.preventDefault();
                console.log('left');
                moverElemento(selectedPos, 'left');
            } else if ((e.key === 'ArrowRight') || (e.key === 'd')) {
                // Mover el elemento a la derecha
                e.preventDefault();
                console.log('right');
                moverElemento(selectedPos, 'right');
            } else if ((e.key === 'ArrowUp') || (e.key === 'w')) {
                // Mover el elemento al grupo anterior
                e.preventDefault();
                console.log('up');
                moverElemento(selectedPos, 'up');
            } else if ((e.key === 'ArrowDown') || (e.key === 's')) {
                // Mover el elemento al grupo siguiente
                e.preventDefault();
                console.log('down');
                moverElemento(selectedPos, 'down');
            } else if (e.key === 'n') {
                // Añadir un nuevo elemento
                e.preventDefault();
                console.log('add-new Link');
                addNewElement('#', 'NewLink', '');
            } else if (e.key === 'm') {
                // Añadir un nuevo elemento separador
                e.preventDefault();
                console.log('add-new Link');
                addNewElement('separator', '', '');
            } else if (e.key === 'x') {
                // Eliminar el elemento seleccionado
                e.preventDefault();
                console.log('delete');
                eliminarElemento(selectedPos);
            }
        }
        return;
    }

    // No interceptar las combinaciones con Ctrl (excepto excepciones), Super/Meta o Alt.
    if (e.altKey || e.metaKey || (e.ctrlKey && !managedCtrlKeys.has(e.key))) {
        return;
    };

    // Tratamiento de teclas sin ctrl, ni alt, ni meta (excepto Ctrl+Backspace)
    if ((e.key === '/') && !isSearchMode) {
        e.preventDefault();
        enableSearchMode();
    } else if (e.key === 'Enter') {
        if (isSearchMode) {
            e.preventDefault();
            switch (filterText) {
                case '!download':
                    downloadSettings();
                    break;
                case '!upload':
                    uploadSettings();
                    break;
                default:
                    googleSearch(); // Realiza la búsqueda en Google
            }
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
    } else if (e.ctrlKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        handlePaste();
    } else if (e.key.length === 1) {
        filterText = filterText.slice(0, cursorPos) + e.key + filterText.slice(cursorPos);
        cursorPos += 1;
        actualizarFiltro();
    } else if (e.key === 'Backspace') {
        e.preventDefault();
        if (!e.ctrlKey) {
            if (cursorPos > 0) {
                filterText = filterText.slice(0, cursorPos - 1) + filterText.slice(cursorPos);
                cursorPos -= 1;
            }
        } else {
            // Should delete a whole word including spaces after
            let wordStart = cursorPos;
            while ((wordStart > 0) && (filterText[wordStart - 1] === ' ')) {
                wordStart -= 1;
            }
            while ((wordStart > 0) && (filterText[wordStart - 1] !== ' ')) {
                wordStart -= 1;
            }
            filterText = filterText.slice(0, wordStart) + filterText.slice(cursorPos);
            cursorPos = wordStart;
            if ((filterText === '') && isSearchMode) {
                disableSearchMode();
            }
        }
        actualizarFiltro();
    } else if (e.key === 'Delete') {
        e.preventDefault();
        if (!e.ctrlKey) {
            if (cursorPos < filterText.length) {
                filterText = filterText.slice(0, cursorPos) + filterText.slice(cursorPos + 1);
            }
        } else {
            // Should delete a whole word including spaces before
            let wordEnd = cursorPos;
            while ((wordEnd < filterText.length) && (filterText[wordEnd] !== ' ')) {
                wordEnd += 1;
            }
            while ((wordEnd < filterText.length) && (filterText[wordEnd] === ' ')) {
                wordEnd += 1;
            }
            filterText = filterText.slice(0, cursorPos) + filterText.slice(wordEnd);
            if ((filterText === '') && isSearchMode) {
                disableSearchMode();
            }
        }
        actualizarFiltro();
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (!e.ctrlKey) {
            if (cursorPos > 0) {
                cursorPos -= 1;
            }
        } else {
            // Should move the cursor to the beginning of the word
            while ((cursorPos > 0) && (filterText[cursorPos - 1] === ' ')) {
                cursorPos -= 1;
            }
            while ((cursorPos > 0) && (filterText[cursorPos - 1] !== ' ')) {
                cursorPos -= 1;
            }
        }
        actualizarFiltro();
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (!e.ctrlKey) {
            if (cursorPos < filterText.length) {
                cursorPos += 1;
            }
        } else {
            // Should move the cursor to the end of the word
            while ((cursorPos < filterText.length) && (filterText[cursorPos] !== ' ')) {
                cursorPos += 1;
            }
            while ((cursorPos < filterText.length) && (filterText[cursorPos] === ' ')) {
                cursorPos += 1;
            }
        }
        actualizarFiltro();
    } else if (e.key === 'Home') {
        e.preventDefault();
        cursorPos = 0;
        actualizarFiltro();
    } else if (e.key === 'End') {
        e.preventDefault();
        cursorPos = filterText.length;
        actualizarFiltro();
    } else if ((e.key === 'Tab') && (!e.shiftKey)) {
        e.preventDefault();
        if (!isSearchMode && (selectedPos !== null)) {
            do {
                selectedPos = (selectedPos + 1) % elements.length;
            } while (elements[selectedPos].classList.contains('discarded'));
            destacarSeleccionado();
        }
    } else if ((e.key === 'Tab') && (e.shiftKey)) {
        e.preventDefault();
        if (!isSearchMode && (selectedPos !== null)) {
            do {
                selectedPos = (selectedPos - 1 + elements.length) % elements.length;
            } while (elements[selectedPos].classList.contains('discarded'));
            destacarSeleccionado();
        }
    }
});

settingsIcon.addEventListener('click', () => {
    // Si tenemos abierto el dialogo de edición, deshabilitar el icono de modo edición.
    if (isEditDialogOpen) {
        return;
    }

    isEditMode = !isEditMode;

    if (isEditMode) {
        filterText = '';
        if (isSearchMode) {
            disableSearchMode();
        }
        actualizarFiltro();
        document.documentElement.classList.add('edit-mode'); // Activa la clase en <html>
        console.log('Modo edición activado');
    } else {
        selectedPos = null;
        destacarSeleccionado();
        saveCatalogToLocal(catalogToUse); // Guarda el catálogo en el almacenamiento local
        UnsavedChanges = false;
        document.documentElement.classList.remove('edit-mode'); // Desactiva la clase en <html>
        console.log('Modo edición desactivado');
    }
});

function openEditDialog() {
    if (selectedPos === null) return;

    const selectedData = catalogToUse[selectedPos];

    document.getElementById('editName').value = selectedData.name;
    document.getElementById('editAddr').value = selectedData.addr;
    document.getElementById('editIcon').value = selectedData.icon;

    if (selectedData.addr === 'separator') {
        editFormAddress.classList.add('hidden');
    } else {
        editFormAddress.classList.remove('hidden');
    }
    isEditDialogOpen = true;
    editDialog.classList.remove('hidden');
}

saveEditButton.addEventListener('click', () => {
    if (selectedPos === null) return;

    const selectedData = catalogToUse[selectedPos];
    if (!selectedData) return;

    selectedData.name = document.getElementById('editName').value;
    selectedData.addr = document.getElementById('editAddr').value;
    selectedData.icon = document.getElementById('editIcon').value;

    UnsavedChanges = true;
    actualizarVista();
    destacarSeleccionado();
    closeEditDialog();
});


cancelEditButton.addEventListener('click', closeEditDialog);

function closeEditDialog() {
    isEditDialogOpen = false;
    editDialog.classList.add('hidden');
}

function moverElemento(index, direction) {
    UnsavedChanges = true;
    if (index < 0 || index >= catalogToUse.length) return;

    let targetIndex = index;
    if (direction === 'left' && index > 0) {
        targetIndex = index - 1;
    } else if (direction === 'right' && index < catalogToUse.length - 1) {
        targetIndex = index + 1;
    }

    if (targetIndex !== index) {
        console.log('Intercambio: ' + index + '-' + targetIndex);

        // Intercambiar los elementos en el array
        [catalogToUse[index], catalogToUse[targetIndex]] = [catalogToUse[targetIndex], catalogToUse[index]];

        // Actualizar el DOM directamente
        const parent = document.getElementById('icons');
        const elementToMove = elements[index];
        const targetElement = elements[targetIndex];

        if (direction === 'left') {
            parent.insertBefore(elementToMove, targetElement); // Mover antes del objetivo
        } else if (direction === 'right') {
            parent.insertBefore(targetElement, elementToMove); // Mover después del objetivo
            parent.insertBefore(elementToMove, targetElement.nextSibling); // Recolocar después
        }

        // Actualizar el array de elementos DOM
        [elements[index], elements[targetIndex]] = [elements[targetIndex], elements[index]];

        // Actualizar la selección
        selectedPos = targetIndex;
        destacarSeleccionado();
    }
}

function eliminarElemento() {
    UnsavedChanges = true;
    if (selectedPos === null) return;

    catalogToUse.splice(selectedPos, 1);

    // Actualizar la vista
    actualizarVista();
    selectedPos = null;
    destacarSeleccionado();
}

function addNewElement(newAddr, newName, newIcon) {
    UnsavedChanges = true;
    const newElement = {
        addr: newAddr,
        name: newName,
        icon: newIcon
    };

    // Determinar la posición en la que se insertará el nuevo elemento
    const insertPos = (selectedPos !== null) ? selectedPos + 1 : catalogToUse.length;

    // Insertar el nuevo elemento en el array `catalogToUse`
    catalogToUse.splice(insertPos, 0, newElement);

    // Usar las funciones actualizadas para insertar directamente en la posición deseada
    if (newElement.addr === 'separator') {
        addSeparator(newElement, insertPos);
    } else {
        addLink(newElement, insertPos);
    }

    // Actualizar las referencias de los elementos DOM
    elements = Array.from(contenedor.children);

    // Actualizar la selección al nuevo elemento
    selectedPos = insertPos;
    destacarSeleccionado();

    if (newElement.addr !== 'separator') {
        openEditDialog();
    }
}

function actualizarVista() {
    const contenedor = document.getElementById('icons');
    contenedor.innerHTML = ''; // Limpiar el contenedor

    // Regenerar los íconos
    populateCatalog(catalogToUse);

    // Actualizar la referencia global a los íconos
    elements = Array.from(contenedor.children);
}

// Evento beforeunload: se dispara antes de que la pestaña se cierre o se recargue
window.addEventListener("beforeunload", function (e) {
    if (UnsavedChanges) {
        // Previene el cierre sin aviso
        e.preventDefault();
        // La especificación actual no permite modificar el texto mostrado por el navegador.
        // Basta con asignar un valor vacío a returnValue.
        e.returnValue = '';
    }
});

