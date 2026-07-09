// *** Global Vars ***
let elements = [];
let isSearchMode = false;
let isAutoSeachMode = false;
let selectedPos = null;
let filterText = '';
let cursorPos = 0;
let isEditMode = false;
let isEditDialogOpen = false;
let isSearchEngineDialogOpen = false;
let isHelpDialogOpen = false;
let isFilterBarVisible = false;
let UnsavedChanges = false;
let editIsNew = false;
let editSnapshot = null;
let editSnapshotUnsavedChanges = false;
let calculatorCopyFeedbackTimeout = null;
let iconPickerCatalog = [];
let isIconPickerLoading = false;

// global doument elements
const searchBackground = document.getElementById('backgroundOverlay')
const filtroDisplay = document.getElementById('filtro');
const calcPreview = document.getElementById('calcPreview');
const helpIcon = document.getElementById('helpIcon');
const helpDialog = document.getElementById('helpDialog');
const closeHelpDialogButton = document.getElementById('closeHelpDialog');
const settingsIcon = document.getElementById('settingsIcon');
const editDialog = document.getElementById('editDialog');
const editFormAddress = document.getElementById('editFormAddress');
const saveEditButton = document.getElementById('saveEdit');
const cancelEditButton = document.getElementById('cancelEdit');
const editIconInput = document.getElementById('editIcon');
const iconPreviewBox = document.getElementById('iconPreviewBox');
const iconPreviewIcon = document.getElementById('iconPreviewIcon');
const openIconPickerButton = document.getElementById('openIconPickerButton');
const closeIconPickerButton = document.getElementById('closeIconPickerButton');
const iconPickerDialog = document.getElementById('iconPickerDialog');
const iconPickerSearch = document.getElementById('iconPickerSearch');
const iconPickerResults = document.getElementById('iconPickerResults');
const searchEngineMenu = document.getElementById('searchEngineMenu');
const searchEngineDialog = document.getElementById('searchEngineDialog');
const searchEngineOptions = document.getElementById('searchEngineOptions');
const currentSearchEngineName = document.getElementById('currentSearchEngineName');
const currentSearchEngineUrl = document.getElementById('currentSearchEngineUrl');
const saveSearchEngineButton = document.getElementById('saveSearchEngine');
const cancelSearchEngineButton = document.getElementById('cancelSearchEngine');
const contenedor = document.getElementById('icons');

const SEARCH_ENGINE_NAME_KEY = 'searchEngineName';
const DEFAULT_ICON = 'fa-solid fa-bookmark';
const SEARCH_ENGINE_URL_KEY = 'searchEngineUrl';
const APP_STATE_KEY = 'userCatalog';
const DATA_STAMP_KEY = 'versionStamp';
const SEARCH_QUERY_PLACEHOLDER = '%s';
const fallbackSearchEngine = {
    name: 'Google',
    url: 'https://www.google.com/search?q=%s'
};
const searchEngineList = (typeof searchEnginePresets !== 'undefined' && Array.isArray(searchEnginePresets) && searchEnginePresets.length > 0)
    ? searchEnginePresets
    : [fallbackSearchEngine];

let dataStampStatus = null;

// Allowed Ctrl keys
const managedCtrlKeys = new Set(['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'v', 'V']);

// Url and IPv4 detection RegEx
const dominioRegex = new RegExp(
    `^(?:(?:[a-z0-9]+\\.)*[a-z0-9]+\\.[a-z]{2,63}|\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})(?::\\d{1,5})?(?:/.*)?$`, "i"
);

// Carga del estado (catalogo + search engine) desde almacenamiento local del navegador
const persistedState = loadAppStateFromLocal();
let catalogToUse = persistedState.bookmarks || initialCatalog;
let currentSearchEngine = persistedState.searchEngine || normalizeSearchEngine(fallbackSearchEngine);
updateSearchPromptLabel();
console.log('Bookmark list is ' + catalogToUse.length + ' items long');

// Añadir los iconos al contenedor
populateCatalog(catalogToUse);

// Procesar parámetros de URL si los hay
handleUrlParams();

if (isStandalone()) {
    console.log('Standalone Mode!');
}

function addSeparator(catalogItem, position = null) {
    const separator = document.createElement('div');
    separator.className = 'separator discarded';
    separator.dataset.nombre = catalogItem.name;
    separator.textContent = catalogItem.name || '';

    if (catalogItem.icon) {
        const icon = document.createElement('i');
        icon.className = catalogItem.icon;
        separator.appendChild(icon);
    }

    if (position !== null && contenedor.children[position]) {
        contenedor.insertBefore(separator, contenedor.children[position]);
    } else {
        contenedor.appendChild(separator);
    }

    separator.addEventListener('click', function (event) {
        handleLinkEvent(event, '');
    });
}


function addLink(catalogItem, position = null) {
    const anchor = document.createElement('a');
    anchor.className = 'icono';
    anchor.href = catalogItem.addr;
    anchor.dataset.nombre = catalogItem.name;

    const icon = document.createElement('i');
    icon.className = catalogItem.icon;
    const text = document.createTextNode(catalogItem.name);

    anchor.appendChild(icon);
    anchor.appendChild(text);

    if (position !== null && contenedor.children[position]) {
        contenedor.insertBefore(anchor, contenedor.children[position]);
    } else {
        contenedor.appendChild(anchor);
    }

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
    highlightSelected();
}

function handleLinkEvent(event, href) {
    if (isEditMode) {
        event.preventDefault();
        if (isEditDialogOpen) {
            return;
        }
        const clickedIcon = event.target.closest('.icono, .separator');
        if (clickedIcon) {
            // Seleccionar el elemento clicado
            selectedPos = Array.from(elements).indexOf(clickedIcon);

            // Actualizar la selección visual
            highlightSelected();
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
        highlightSelected();
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

    const isCalculatorExpression = Boolean(evaluateMathExpression(filterText));

    // Si detectamos una operación de calculadora válida, activamos el cuadro de búsqueda central.
    if (isCalculatorExpression) {
        if (!isSearchMode) {
            isAutoSeachMode = true;
            enableSearchMode();
        }
    }
    // En caso de haber entrado una cadena de filtro que no se cumple en ninguno de los enlaces, se activa el modo de búsqueda automaticamente, este modo de busqueda automatica se desactiva al borrar caracteres aidel filtro y encontrar al menos un enlace que cumpla el filtro.
    else if ((selectedPos === null) && (filterText.length > 1)) {
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
    highlightSelected();
}


// Función para convertir el filtro en una expresión regular
function crearRegexDeFiltro(filtro) {
    const filtroLower = filtro.toLowerCase();
    const regexString = filtroLower
        .split('')
        .map((char) => `.*${char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
        .join('');
    return new RegExp(regexString, 'i');
}

function highlightSelected() {
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

function openBookmark() {
    const enlace = elements[selectedPos].getAttribute('href');
    window.open(enlace, '_self'); // Abre el enlace en la ventana actual
}

function performSearch() {
    if (isValidUrl(filterText)) {
        if (!filterText.startsWith('http')) {
            filterText = 'https://' + filterText;
        }
        window.open(filterText, '_self');
    } else {
        const url = buildSearchUrl(filterText);
        window.open(url, '_self');
    }
}

function ensureSearchTemplate(url) {
    const normalizedUrl = String(url || '').trim();
    if (!normalizedUrl) {
        return 'https://www.google.com/search?q=' + SEARCH_QUERY_PLACEHOLDER;
    }

    // Acepta placeholders comunes pegados por el usuario y los normaliza a %s.
    const placeholderRegex = /%s|%1|\(1\)|\{searchTerms\}|\{query\}|\{\{query\}\}/gi;
    if (placeholderRegex.test(normalizedUrl)) {
        return normalizedUrl.replaceAll(placeholderRegex, SEARCH_QUERY_PLACEHOLDER);
    }

    const separator = normalizedUrl.includes('?') ? '&' : '?';
    return normalizedUrl + separator + 'q=' + SEARCH_QUERY_PLACEHOLDER;
}

function normalizeSearchEngine(searchEngine) {
    const fallback = normalizeSearchEngineFallback();
    if (!searchEngine || typeof searchEngine !== 'object') {
        return fallback;
    }

    const safeName = String(searchEngine.name || '').trim() || fallback.name;
    const safeUrl = ensureSearchTemplate(searchEngine.url || fallback.url);
    return {
        name: safeName,
        url: safeUrl
    };
}

function normalizeSearchEngineFallback() {
    return {
        name: fallbackSearchEngine.name,
        url: fallbackSearchEngine.url
    };
}

function buildSearchUrl(queryText) {
    const encodedQuery = encodeURIComponent(queryText);
    return currentSearchEngine.url.replaceAll(SEARCH_QUERY_PLACEHOLDER, encodedQuery);
}

function setCurrentSearchEngine(searchEngine, markUnsaved = false) {
    const normalized = normalizeSearchEngine(searchEngine);
    currentSearchEngine = normalized;
    updateSearchPromptLabel();
    if (markUnsaved) {
        UnsavedChanges = true;
    }
}

function updateSearchPromptLabel() {
    const hasCalculatorResult = Boolean(evaluateMathExpression(filterText));
    filtroDisplay.dataset.searchLabel = hasCalculatorResult ? 'Calculator' : 'Search ' + currentSearchEngine.name;
}

//--- Functions for Filter/Search visualization

function updateFilterDisplay() {
    // Actualiza el contenido del filtro con el cursor
    filtroDisplay.innerHTML = filterText.slice(0, cursorPos) + '\u200B<span id="cursor"></span>\u200B' + filterText.slice(cursorPos);
    updateSearchPromptLabel();

    isFilterBarVisible = isSearchMode || Boolean(filterText);

    if (isSearchMode) {
        updateUrlColor();
    }

    filtroDisplay.style.visibility = isFilterBarVisible ? 'visible' : 'hidden';
    updateCalculatorPreview();
}

function updateBackgroundOverlayVisibility() {
    const shouldShowOverlay = isSearchMode || isHelpDialogOpen || isEditDialogOpen || isSearchEngineDialogOpen;
    searchBackground.style.visibility = shouldShowOverlay ? 'visible' : 'hidden';
}

function enableSearchMode() {
    isSearchMode = true;
    updateUrlColor();
    filtroDisplay.classList.add('search-modal');
    updateBackgroundOverlayVisibility();
    updateFilterDisplay();
}

function disableSearchMode() {
    isSearchMode = false;
    isAutoSeachMode = false;
    filtroDisplay.classList.remove('search-modal');
    filtroDisplay.classList.remove('valid-url');
    updateBackgroundOverlayVisibility();
    updateFilterDisplay();
}

function isValidUrl(texto) {
    try {
        if (dominioRegex.test(texto)) {
            texto = "https://" + texto;
        }
        new URL(texto);
        return true;
    } catch (e) {
        return false;
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

function hasBalancedParentheses(expression) {
    let balance = 0;
    for (const char of expression) {
        if (char === '(') {
            balance += 1;
        } else if (char === ')') {
            balance -= 1;
            if (balance < 0) {
                return false;
            }
        }
    }
    return balance === 0;
}

function getDecimalishApi() {
    if (typeof window !== 'undefined' && window.decimalish) {
        return window.decimalish;
    }
    return null;
}

function tokenizeMathExpression(expressionText) {
    const tokens = [];
    let index = 0;

    while (index < expressionText.length) {
        const char = expressionText[index];

        if (/\s/.test(char)) {
            index += 1;
            continue;
        }

        if (char === '/' && expressionText[index + 1] === '/') {
            tokens.push({ type: 'operator', value: '//' });
            index += 2;
            continue;
        }

        if (/[+\-*/%^()]/.test(char)) {
            tokens.push({ type: 'operator', value: char });
            index += 1;
            continue;
        }

        const numberMatch = expressionText.slice(index).match(/^(?:\d+\.?\d*|\.\d+)(?:e[+\-]?\d+)?/i);
        if (numberMatch) {
            tokens.push({ type: 'number', value: numberMatch[0] });
            index += numberMatch[0].length;
            continue;
        }

        throw new Error('INVALID_TOKEN');
    }

    return tokens;
}

function evaluateMathTokensWithDecimalish(tokens, decimalishApi) {
    const decimalish = decimalishApi;
    let cursor = 0;
    let divRemResult = null;

    function currentToken() {
        return tokens[cursor] || null;
    }

    function consumeToken(expectedValue = null) {
        const token = currentToken();
        if (!token) {
            return null;
        }

        if ((expectedValue !== null) && (token.value !== expectedValue)) {
            return null;
        }

        cursor += 1;
        return token;
    }

    function parsePrimary() {
        const token = currentToken();
        if (!token) {
            throw new Error('UNEXPECTED_END');
        }

        if (token.type === 'number') {
            consumeToken();
            return decimalish.decimal(token.value);
        }

        if (token.value === '(') {
            consumeToken('(');
            const expressionValue = parseAddSub();
            if (!consumeToken(')')) {
                throw new Error('MISSING_PAREN');
            }
            return expressionValue;
        }

        throw new Error('UNEXPECTED_TOKEN');
    }

    function parseUnary() {
        const token = currentToken();
        if (token && token.type === 'operator' && (token.value === '+' || token.value === '-')) {
            consumeToken();
            const value = parseUnary();
            return token.value === '-' ? decimalish.neg(value) : value;
        }
        return parsePrimary();
    }

    function parsePower() {
        const base = parseUnary();
        const token = currentToken();
        if (!token || token.value !== '^') {
            return base;
        }

        consumeToken('^');
        const exponent = parsePower();

        try {
            return decimalish.pow(base, exponent);
        } catch {
            const fallbackResult = Math.pow(Number(base), Number(exponent));
            if (!Number.isFinite(fallbackResult)) {
                throw new Error('INVALID_POWER');
            }
            return decimalish.decimal(String(fallbackResult));
        }
    }

    function parseMulDivRem() {
        let value = parsePower();

        while (true) {
            const token = currentToken();
            if (!token || !['*', '/', '%', '//'].includes(token.value)) {
                break;
            }

            consumeToken();
            const right = parsePower();

            if (token.value === '*') {
                value = decimalish.mul(value, right);
                divRemResult = null;
            } else if (token.value === '/') {
                value = decimalish.div(value, right);
                divRemResult = null;
            } else if (token.value === '//') {
                const [quotient, remainder] = decimalish.divRem(value, right);
                value = quotient;
                divRemResult = {
                    quotient,
                    remainder
                };
            } else {
                value = decimalish.rem(value, right);
                divRemResult = null;
            }
        }

        return value;
    }

    function parseAddSub() {
        let value = parseMulDivRem();

        while (true) {
            const token = currentToken();
            if (!token || !['+', '-'].includes(token.value)) {
                break;
            }

            consumeToken();
            const right = parseMulDivRem();
            value = token.value === '+' ? decimalish.add(value, right) : decimalish.sub(value, right);
            divRemResult = null;
        }

        return value;
    }

    const result = parseAddSub();
    if (cursor !== tokens.length) {
        throw new Error('TRAILING_TOKENS');
    }

    return {
        value: result,
        divRem: divRemResult
    };
}

function evaluateMathExpression(expressionText) {
    const decimalish = getDecimalishApi();
    if (!decimalish) {
        return null;
    }

    const rawExpression = String(expressionText || '').trim();
    if (!rawExpression) {
        return null;
    }

    if (!/\d/.test(rawExpression)) {
        return null;
    }

    if (!/[+\-*/%^]/.test(rawExpression)) {
        return null;
    }

    const normalizedExpression = normalizeMathExpressionForLocale(rawExpression);

    if (!/^[\deE+\-*/%^().\s]+$/.test(normalizedExpression)) {
        return null;
    }

    if (!hasBalancedParentheses(rawExpression)) {
        return null;
    }

    const compactExpression = normalizedExpression.replace(/\s+/g, '');
    if (!compactExpression || /[+\-*/%^.]$/.test(compactExpression)) {
        return null;
    }

    try {
        const tokens = tokenizeMathExpression(compactExpression);
        const parsedResult = evaluateMathTokensWithDecimalish(tokens, decimalish);

        return {
            expression: rawExpression,
            result: parsedResult.value,
            divRem: parsedResult.divRem
        };
    } catch {
        return null;
    }
}

function hideCalculatorPreview() {
    calcPreview.classList.add('hidden');
}

function getBrowserLocale() {
    if (typeof navigator !== 'undefined') {
        if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
            return navigator.languages;
        }

        if (navigator.language) {
            return navigator.language;
        }
    }

    return undefined;
}

function getCalculatorNumberSeparators() {
    const parts = new Intl.NumberFormat(getBrowserLocale()).formatToParts(12345.6);
    const groupPart = parts.find((part) => part.type === 'group');
    const decimalPart = parts.find((part) => part.type === 'decimal');

    return {
        group: groupPart ? groupPart.value : ',',
        decimal: decimalPart ? decimalPart.value : '.'
    };
}

function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeMathExpressionForLocale(expressionText) {
    const separators = getCalculatorNumberSeparators();
    let normalized = String(expressionText || '');

    const decimalSeparator = separators.decimal;
    const groupSeparator = separators.group;

    if (groupSeparator && groupSeparator !== decimalSeparator) {
        const escapedGroup = escapeRegExp(groupSeparator);
        const groupBetweenThousands = new RegExp('(\\d)' + escapedGroup + '(?=\\d{3}(?:\\D|$))', 'g');
        normalized = normalized.replace(groupBetweenThousands, '$1');
    }

    if (decimalSeparator && decimalSeparator !== '.') {
        const escapedDecimal = escapeRegExp(decimalSeparator);
        const decimalBetweenDigits = new RegExp('(\\d)' + escapedDecimal + '(?=\\d)', 'g');
        const decimalAfterOperator = new RegExp('(^|[+\\-*/%^()\\s])' + escapedDecimal + '(?=\\d)', 'g');
        normalized = normalized
            .replace(decimalBetweenDigits, '$1.')
            .replace(decimalAfterOperator, '$1.');
    }

    return normalized;
}

function formatDecimalStringForLocale(decimalString, separators) {
    const sign = decimalString.startsWith('-') ? '-' : '';
    const unsignedValue = sign ? decimalString.slice(1) : decimalString;
    const parts = unsignedValue.split('.');
    const integerPart = parts[0] || '0';
    const fractionPart = parts[1] || '';
    const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, separators.group);

    return sign + groupedInteger + (fractionPart ? separators.decimal + fractionPart : '');
}

function formatCalculatorResult(value) {
    const decimalish = getDecimalishApi();
    if (!decimalish) {
        const fallbackText = String(value);
        return {
            html: fallbackText,
            text: fallbackText
        };
    }

    if (decimalish.eq(value, '0')) {
        return {
            html: '0',
            text: '0'
        };
    }

    const separators = getCalculatorNumberSeparators();
    const absoluteValue = decimalish.abs(value);
    const hasLargeIntegerPart = decimalish.gte(absoluteValue, '1') && (decimalish.scale(absoluteValue) + 1 > 15);
    const hasTinyMagnitude = decimalish.lt(absoluteValue, '1e-10');
    const shouldUseExponential = hasLargeIntegerPart || hasTinyMagnitude;

    if (shouldUseExponential) {
        const [mantissaRaw, exponentRaw] = decimalish.toExponential(value, { places: 12 }).split('e');
        const mantissa = mantissaRaw
            .replace(/(\.\d*?[1-9])0+$/, '$1')
            .replace(/\.0+$/, '');
        const localizedMantissa = formatDecimalStringForLocale(mantissa, separators);
        const exponent = String(Number(exponentRaw));
        return {
            html: "<span class='scientific-number'><span>" + localizedMantissa + "</span><span>&times;</span><span class='power-block'><span>10</span><span class='power-exponent'>" + exponent + '</span></span></span>',
            text: localizedMantissa + '*10^' + exponent
        };
    }

    const fixedValue = decimalish.toFixed(value);
    const formattedValue = formatDecimalStringForLocale(fixedValue, separators);

    return {
        html: formattedValue,
        text: formattedValue
    };
}

function formatCalculatorEvaluationHtml(evaluation) {
    const formattedResult = formatCalculatorResult(evaluation.result);

    if (!evaluation.divRem) {
        return formattedResult.html;
    }

    const quotientFormatted = formatCalculatorResult(evaluation.divRem.quotient);
    const remainderFormatted = formatCalculatorResult(evaluation.divRem.remainder);
    const rawRemainder = String(evaluation.divRem.remainder);
    return rawRemainder !== '0'
        ? quotientFormatted.html + ' r:' + remainderFormatted.html
        : quotientFormatted.html;
}

function formatCalculatorEvaluationText(evaluation) {
    const formattedResult = formatCalculatorResult(evaluation.result);

    if (!evaluation.divRem) {
        return formattedResult.text;
    }

    const quotientFormatted = formatCalculatorResult(evaluation.divRem.quotient);
    const remainderFormatted = formatCalculatorResult(evaluation.divRem.remainder);
    const rawRemainder = String(evaluation.divRem.remainder);
    return rawRemainder !== '0'
        ? quotientFormatted.text + ' r:' + remainderFormatted.text
        : quotientFormatted.text;
}

function stripThousandsSeparatorsForCopy(text) {
    const separators = getCalculatorNumberSeparators();
    const groupSeparator = separators.group;

    if (!groupSeparator) {
        return text;
    }

    const escapedGroup = escapeRegExp(groupSeparator);
    const groupBetweenDigits = new RegExp('(?<=\\d)' + escapedGroup + '(?=\\d{3}(?:\\D|$))', 'g');
    return String(text || '').replace(groupBetweenDigits, '');
}

function getCalculatorCopyTextFromEvaluation(evaluation) {
    if (!evaluation) {
        return '';
    }

    const localizedText = formatCalculatorEvaluationText(evaluation);
    return stripThousandsSeparatorsForCopy(localizedText);
}

function placeCalculatorPreview() {
    const rect = filtroDisplay.getBoundingClientRect();
    calcPreview.style.left = (rect.left + rect.width / 2) + 'px';
    calcPreview.style.top = (rect.top - 10) + 'px';
}

function updateCalculatorPreview() {
    if (!isFilterBarVisible) {
        hideCalculatorPreview();
        return;
    }

    const evaluation = evaluateMathExpression(filterText);
    if (!evaluation) {
        hideCalculatorPreview();
        return;
    }

    const formattedHtml = formatCalculatorEvaluationHtml(evaluation);
    calcPreview.innerHTML = formattedHtml;
    placeCalculatorPreview();
    calcPreview.classList.remove('hidden');
}

function showCalculatorCopyFeedback(isSuccess) {
    calcPreview.classList.remove('copy-feedback', 'copy-feedback-success', 'copy-feedback-error');

    // Reinicia la animacion si se copia varias veces seguidas.
    void calcPreview.offsetWidth;

    calcPreview.classList.add('copy-feedback');
    calcPreview.classList.add(isSuccess ? 'copy-feedback-success' : 'copy-feedback-error');

    if (calculatorCopyFeedbackTimeout) {
        clearTimeout(calculatorCopyFeedbackTimeout);
    }

    calculatorCopyFeedbackTimeout = setTimeout(() => {
        calcPreview.classList.remove('copy-feedback', 'copy-feedback-success', 'copy-feedback-error');
        calculatorCopyFeedbackTimeout = null;
    }, 950);
}

window.addEventListener('resize', updateCalculatorPreview);

function openHelpPage() {
    if (isHelpDialogOpen) {
        closeHelpDialog();
        return;
    }

    if (isEditMode || isEditDialogOpen) {
        return;
    }
    isHelpDialogOpen = true;
    helpDialog.classList.remove('hidden');
    document.documentElement.classList.add('help-open');
    updateBackgroundOverlayVisibility();
}

function closeHelpDialog() {
    isHelpDialogOpen = false;
    helpDialog.classList.add('hidden');
    document.documentElement.classList.remove('help-open');
    updateBackgroundOverlayVisibility();
}

function setEditMode(enabled) {
    isEditMode = enabled;

    if (isEditMode) {
        filterText = '';
        if (isSearchMode) {
            disableSearchMode();
        }
        if (isHelpDialogOpen) {
            closeHelpDialog();
        }
        actualizarFiltro();
        document.documentElement.classList.add('edit-mode'); // Activa la clase en <html>
        console.log('Modo edición activado');
    } else {
        if (isEditDialogOpen) {
            closeEditDialog();
        }
        if (isSearchEngineDialogOpen) {
            closeSearchEngineDialog();
        }
        selectedPos = null;
        highlightSelected();
        const saved = saveAppStateToLocal(catalogToUse, currentSearchEngine); // Guarda el estado en el almacenamiento local
        if (!saved) {
            return;
        }
        UnsavedChanges = false;
        document.documentElement.classList.remove('edit-mode'); // Desactiva la clase en <html>
        console.log('Modo edición desactivado');
    }
}

//--- Functions for Download/Upload the Catalog

function downloadSettings() {
    const data = {
        searchEngine: currentSearchEngine,
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

            if (data.searchEngine) {
                setCurrentSearchEngine(data.searchEngine, true);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

//--- Functions for Save/Load the catalog to/from LocalStorage

function loadAppStateFromLocal() {
    dataStampStatus = localStorage.getItem(DATA_STAMP_KEY);

    let bookmarks = null;
    let searchEngine = null;
    const savedName = localStorage.getItem(SEARCH_ENGINE_NAME_KEY);
    const savedUrl = localStorage.getItem(SEARCH_ENGINE_URL_KEY);

    if (savedName && savedUrl) {
        searchEngine = normalizeSearchEngine({ name: savedName, url: savedUrl });
    }

    const savedState = localStorage.getItem(APP_STATE_KEY);
    if (savedState) {
        try {
            const parsedState = JSON.parse(savedState);

            if (Array.isArray(parsedState)) {
                bookmarks = parsedState;
            } else {
                bookmarks = Array.isArray(parsedState.bookmarks) ? parsedState.bookmarks : null;
                searchEngine = parsedState.searchEngine ? normalizeSearchEngine(parsedState.searchEngine) : searchEngine;
            }
        } catch {
            // Ignore invalid userCatalog JSON.
        }
    }

    return {
        bookmarks,
        searchEngine
    };
}

function saveAppStateToLocal(bookmarks, searchEngine) {
    if (!canPersistChangesWithStamp()) {
        return false;
    }

    const normalized = normalizeSearchEngine(searchEngine);
    const state = {
        bookmarks: Array.isArray(bookmarks) ? bookmarks : [],
        searchEngine: normalized
    };

    localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));

    // Mantener las claves del search engine por compatibilidad hacia atras.
    localStorage.setItem(SEARCH_ENGINE_NAME_KEY, normalized.name);
    localStorage.setItem(SEARCH_ENGINE_URL_KEY, normalized.url);

    refreshDataStamp();
    return true;
}

function generateGuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    const randomChunk = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
    return randomChunk() + randomChunk() + '-' + randomChunk() + '-' + randomChunk() + '-' + randomChunk() + '-' + randomChunk() + randomChunk() + randomChunk();
}

function refreshDataStamp() {
    const newStamp = generateGuid();
    localStorage.setItem(DATA_STAMP_KEY, newStamp);
    dataStampStatus = newStamp;
}

function canPersistChangesWithStamp() {
    const currentStamp = localStorage.getItem(DATA_STAMP_KEY);

    if (!currentStamp) {
        return true;
    }

    if (currentStamp === dataStampStatus) {
        return true;
    }

    return window.confirm('Data has changed and overwriting may cause data loss. Do you want to overwrite?');
}

//--- Función asíncrona para manejar el pegado desde el portapapeles
async function handlePaste() {
    const clipboardText = await navigator.clipboard.readText();
    enableSearchMode();
    filterText = filterText.slice(0, cursorPos) + clipboardText + filterText.slice(cursorPos);
    cursorPos += clipboardText.length;
    actualizarFiltro();
}

function renderSearchEngineOptions() {
    searchEngineOptions.innerHTML = '';

    const sortedSearchEngineList = searchEngineList
        .map((searchEngine, index) => ({
            searchEngine,
            index,
            normalized: normalizeSearchEngine(searchEngine)
        }))
        .sort((a, b) => a.normalized.name.localeCompare(b.normalized.name, 'es', { sensitivity: 'base' }));

    sortedSearchEngineList.forEach((entry) => {
        const normalized = entry.normalized;
        const optionId = 'searchEngineOption' + entry.index;

        const label = document.createElement('label');
        label.className = 'search-engine-option';
        label.setAttribute('for', optionId);

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'selectedSearchEngine';
        radio.id = optionId;
        radio.value = entry.index;
        radio.checked = (normalized.name === currentSearchEngine.name) && (normalized.url === currentSearchEngine.url);
        radio.addEventListener('change', () => {
            currentSearchEngineName.value = normalized.name;
            currentSearchEngineUrl.value = normalized.url;
        });

        const textContainer = document.createElement('div');
        textContainer.className = 'search-engine-option-name';
        textContainer.textContent = normalized.name;
        label.title = normalized.url;
        label.appendChild(radio);
        label.appendChild(textContainer);
        searchEngineOptions.appendChild(label);
    });

    syncPresetSelectionFromManualFields();
}

function syncPresetSelectionFromManualFields() {
    const typedName = currentSearchEngineName.value.trim();
    const typedUrl = currentSearchEngineUrl.value.trim();

    const matchingPresetEntry = searchEngineList
        .map((searchEngine, index) => ({
            index,
            normalized: normalizeSearchEngine(searchEngine)
        }))
        .find((entry) => {
            return (entry.normalized.name === typedName) && (entry.normalized.url === typedUrl);
        });

    const allPresetOptions = document.querySelectorAll('input[name="selectedSearchEngine"]');
    allPresetOptions.forEach((radio) => {
        radio.checked = matchingPresetEntry ? (Number(radio.value) === matchingPresetEntry.index) : false;
    });
}

function openSearchEngineDialog() {
    if (!isEditMode || isEditDialogOpen || isSearchEngineDialogOpen) {
        return;
    }

    currentSearchEngineName.value = currentSearchEngine.name;
    currentSearchEngineUrl.value = currentSearchEngine.url;
    renderSearchEngineOptions();

    isSearchEngineDialogOpen = true;
    searchEngineDialog.classList.remove('hidden');
}

function closeSearchEngineDialog() {
    isSearchEngineDialogOpen = false;
    searchEngineDialog.classList.add('hidden');
}

function saveSelectedSearchEngine() {
    const manualName = currentSearchEngineName.value.trim();
    const manualUrl = currentSearchEngineUrl.value.trim();
    const selectedOption = document.querySelector('input[name="selectedSearchEngine"]:checked');

    let searchEngineToSave = null;

    if (manualName || manualUrl) {
        searchEngineToSave = {
            name: manualName || currentSearchEngine.name,
            url: manualUrl || currentSearchEngine.url
        };
    } else if (selectedOption) {
        const selectedPreset = searchEngineList[Number(selectedOption.value)];
        if (selectedPreset) {
            searchEngineToSave = selectedPreset;
        }
    }

    setCurrentSearchEngine(searchEngineToSave || currentSearchEngine, true);
    closeSearchEngineDialog();
}

//--- Events de menu-actions

document.getElementById('downloadMenu').addEventListener('click', downloadSettings);
document.getElementById('uploadMenu').addEventListener('click', uploadSettings);
document.getElementById('exitEditMenu').addEventListener('click', () => setEditMode(false));
searchEngineMenu.addEventListener('click', openSearchEngineDialog);
saveSearchEngineButton.addEventListener('click', saveSelectedSearchEngine);
cancelSearchEngineButton.addEventListener('click', closeSearchEngineDialog);
currentSearchEngineName.addEventListener('input', syncPresetSelectionFromManualFields);
currentSearchEngineUrl.addEventListener('input', syncPresetSelectionFromManualFields);

//--- Event Listeners

document.addEventListener('keydown', (e) => {
    // Alternar modo edición con F2 desde cualquier estado
    if (e.key === 'F2') {
        e.preventDefault();
        if (isHelpDialogOpen) {
            closeHelpDialog();
        }
        setEditMode(!isEditMode);
        return;
    }

    if (isHelpDialogOpen) {
        if (e.key === 'Escape' || e.key === '?') {
            e.preventDefault();
            closeHelpDialog();
        }
        return;
    }

    if (isSearchEngineDialogOpen) {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeSearchEngineDialog();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            saveSelectedSearchEngine();
        }
        return;
    }

    // Si tenemos abierto el dialogo de edición, no interceptar el uso de teclado
    if (isEditDialogOpen) {
        if (selectedPos !== null) {
            if (e.key === 'Escape') {
                // Deseleccionar el elemento
                e.preventDefault();
                cancelEditDialog();
            }
            return;
        }
    }

    // Borrar la seleccion de texto si la hubiera
    const selection = window.getSelection();
    if (selection) {
        selection.removeAllRanges();
    }

    if (e.key === '?' && !isEditMode && !(isSearchMode || isFilterBarVisible)) {
        e.preventDefault();
        openHelpPage();
        return;
    }

    // Gestion de teclas en modo edicion
    if (isEditMode) {
        if (e.key === 'F3') {
            e.preventDefault();
            uploadSettings();
            return;
        } else if (e.key === 'F4') {
            e.preventDefault();
            downloadSettings();
            return;
        } else if (e.key === 'F9') {
            e.preventDefault();
            openSearchEngineDialog();
            return;
        }

        if (selectedPos !== null) {

            if (e.key === 'Escape') {
                // Deseleccionar el elemento
                e.preventDefault();
                selectedPos = null;
                highlightSelected();
            } else if (e.key === 'e') {
                // Editar el elemento
                e.preventDefault();
                openEditDialog();
            } else if ((e.key === 'ArrowLeft') || (e.key === 'a')) {
                // Mover el elemento a la izquierda
                e.preventDefault();
                console.log('left');
                moveElement(selectedPos, 'left');
            } else if ((e.key === 'ArrowRight') || (e.key === 'd')) {
                // Mover el elemento a la derecha
                e.preventDefault();
                console.log('right');
                moveElement(selectedPos, 'right');
            } else if ((e.key === 'ArrowUp') || (e.key === 'w')) {
                // Mover el elemento al grupo anterior
                e.preventDefault();
                console.log('up');
                moveElement(selectedPos, 'up');
            } else if ((e.key === 'ArrowDown') || (e.key === 's')) {
                // Mover el elemento al grupo siguiente
                e.preventDefault();
                console.log('down');
                moveElement(selectedPos, 'down');
            } else if (e.key === 'c') {
                // Duplicar el elemento seleccionado
                e.preventDefault();
                console.log('duplicate');
                duplicateElement();
            } else if (e.key === 'x') {
                // Eliminar el elemento seleccionado
                e.preventDefault();
                console.log('delete');
                removeElement(selectedPos);
            }
        }

        if (e.key === 'n') {
            // Añadir un nuevo elemento (funciona con o sin selección)
            e.preventDefault();
            console.log('add-new Link');
            addNewElement('#', 'NewLink', DEFAULT_ICON);
        } else if (e.key === 'm') {
            // Añadir un nuevo elemento separador (funciona con o sin selección)
            e.preventDefault();
            console.log('add-new Separator');
            addNewElement('separator', '', '');
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
            const evaluation = evaluateMathExpression(filterText);
            if (evaluation) {
                const previewCopyText = getCalculatorCopyTextFromEvaluation(evaluation);
                if (!previewCopyText) {
                    return;
                }

                navigator.clipboard.writeText(previewCopyText)
                    .then(() => {
                        showCalculatorCopyFeedback(true);
                    })
                    .catch(() => {
                        showCalculatorCopyFeedback(false);
                    });
                return;
            }
            performSearch(); // Realiza la búsqueda en Google
        } else {
            e.preventDefault();
            openBookmark();
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
            } while (elements[selectedPos].classList.contains('discarded') || elements[selectedPos].classList.contains('separator'));
            highlightSelected();
        }
    } else if ((e.key === 'Tab') && (e.shiftKey)) {
        e.preventDefault();
        if (!isSearchMode && (selectedPos !== null)) {
            do {
                selectedPos = (selectedPos - 1 + elements.length) % elements.length;
            } while (elements[selectedPos].classList.contains('discarded') || elements[selectedPos].classList.contains('separator'));
            highlightSelected();
        }
    }
});

helpIcon.addEventListener('click', openHelpPage);
closeHelpDialogButton.addEventListener('click', closeHelpDialog);
searchBackground.addEventListener('click', () => {
    if (isHelpDialogOpen) {
        closeHelpDialog();
    }
});

settingsIcon.addEventListener('click', () => {
    // Si tenemos abierto el dialogo de edición, deshabilitar el icono de modo edición.
    if (isEditDialogOpen || isSearchEngineDialogOpen) {
        return;
    }

    setEditMode(!isEditMode);
});

function getFontAwesomeFallbackCatalog() {
    return [
        { name: 'bookmark', label: 'Bookmark', classes: ['fa-solid fa-bookmark'] },
        { name: 'house', label: 'Home', classes: ['fa-solid fa-house'] },
        { name: 'star', label: 'Star', classes: ['fa-solid fa-star'] },
        { name: 'link', label: 'Link', classes: ['fa-solid fa-link'] },
        { name: 'plus', label: 'Plus', classes: ['fa-solid fa-plus'] },
        { name: 'minus', label: 'Minus', classes: ['fa-solid fa-minus'] },
        { name: 'trash', label: 'Trash', classes: ['fa-solid fa-trash'] },
        { name: 'pen', label: 'Edit', classes: ['fa-solid fa-pen'] },
        { name: 'magnifying-glass', label: 'Search', classes: ['fa-solid fa-magnifying-glass'] },
        { name: 'download', label: 'Download', classes: ['fa-solid fa-download'] },
        { name: 'upload', label: 'Upload', classes: ['fa-solid fa-upload'] },
        { name: 'wrench', label: 'Settings', classes: ['fa-solid fa-wrench'] },
        { name: 'circle-question', label: 'Help', classes: ['fa-solid fa-circle-question'] },
        { name: 'xmark', label: 'Close', classes: ['fa-solid fa-xmark'] },
        { name: 'github', label: 'GitHub', classes: ['fa-brands fa-github'] }
    ];
}

function buildFontAwesomeClass(iconName, styleName = 'solid') {
    return `fa-${styleName} fa-${iconName}`;
}

function normalizeIconPickerEntry(iconName, details) {
    const styles = Array.isArray(details?.styles) && details.styles.length > 0 ? details.styles : ['solid'];
    const classes = styles.map(style => buildFontAwesomeClass(iconName, style));
    const searchTerms = [
        iconName,
        details?.label,
        ...(Array.isArray(details?.search?.terms) ? details.search.terms : []),
        ...(Array.isArray(details?.search) ? details.search : [])
    ].filter(Boolean);

    return {
        name: iconName,
        label: details?.label || iconName,
        classes,
        searchTerms
    };
}

async function loadIconPickerCatalog() {
    if (iconPickerCatalog.length > 0) {
        renderIconPickerResults(iconPickerSearch.value);
        return;
    }

    if (isIconPickerLoading) {
        return;
    }

    isIconPickerLoading = true;
    renderIconPickerResults('');

    try {
        const response = await fetch('https://cdn.jsdelivr.net/gh/FortAwesome/Font-Awesome@6.x/metadata/icons.json');
        if (!response.ok) {
            throw new Error(`Icon metadata request failed with ${response.status}`);
        }

        const payload = await response.json();
        iconPickerCatalog = Object.entries(payload)
            .filter(([, details]) => details && Array.isArray(details.styles) && details.styles.length > 0)
            .map(([iconName, details]) => normalizeIconPickerEntry(iconName, details))
            .sort((left, right) => left.label.localeCompare(right.label));
    } catch (error) {
        console.warn('Using built-in icon list for the picker.', error);
        iconPickerCatalog = getFontAwesomeFallbackCatalog();
    } finally {
        isIconPickerLoading = false;
        renderIconPickerResults(iconPickerSearch.value);
    }
}

function inferIconPickerQuery(value = '') {
    const tokens = String(value || '').split(/\s+/).filter(Boolean);
    const styleAliases = new Set([
        'fab', 'fas', 'far', 'fal', 'fat', 'fad', 'fak', 'fa',
        'solid', 'regular', 'brands', 'light', 'thin', 'duotone', 'sharp'
    ]);

    for (let index = tokens.length - 1; index >= 0; index -= 1) {
        const token = tokens[index];
        if (token.startsWith('fa-')) {
            const suffix = token.slice(3).toLowerCase();
            if (suffix && !styleAliases.has(suffix)) {
                return suffix;
            }
        }
    }

    for (let index = tokens.length - 1; index >= 0; index -= 1) {
        const token = tokens[index].toLowerCase();
        if (!styleAliases.has(token)) {
            return token.replace(/^fa-/, '');
        }
    }

    return '';
}

function updateIconPreview(value = '') {
    const iconValue = String(value || '').trim();
    const iconClass = iconValue || DEFAULT_ICON;

    if (iconPreviewIcon) {
        iconPreviewIcon.className = iconClass;
    }

    if (iconPreviewBox) {
        iconPreviewBox.title = iconClass;
    }
}

function renderIconPickerResults(query = '') {
    const searchTerm = (query || iconPickerSearch?.value || '').trim().toLowerCase();
    const filteredIcons = !iconPickerCatalog.length
        ? []
        : iconPickerCatalog.filter((entry) => {
            if (!searchTerm) {
                return true;
            }

            return [entry.name, entry.label, ...(entry.searchTerms || [])]
                .filter(Boolean)
                .some((term) => String(term).toLowerCase().includes(searchTerm));
        }).slice(0, 80);

    iconPickerResults.innerHTML = '';

    if (isIconPickerLoading && !iconPickerCatalog.length) {
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'icon-picker-empty';
        loadingMessage.textContent = 'Loading icons…';
        iconPickerResults.appendChild(loadingMessage);
        return;
    }

    if (!filteredIcons.length) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'icon-picker-empty';
        emptyMessage.textContent = 'No icons matched that search.';
        iconPickerResults.appendChild(emptyMessage);
        return;
    }

    const fragment = document.createDocumentFragment();
    filteredIcons.forEach((entry) => {
        const chosenClass = entry.classes[0] || 'fa-solid fa-bookmark';
        const optionButton = document.createElement('button');
        optionButton.type = 'button';
        optionButton.className = 'icon-picker-option';
        optionButton.dataset.iconClass = chosenClass;
        optionButton.innerHTML = `<i class="${chosenClass}"></i><span>${entry.label}</span>`;
        optionButton.addEventListener('click', () => {
            editIconInput.value = chosenClass;
            updateIconPreview(chosenClass);
            closeIconPicker();
        });
        fragment.appendChild(optionButton);
    });

    iconPickerResults.appendChild(fragment);
}

function openIconPicker() {
    if (!iconPickerDialog) {
        return;
    }

    const currentValue = editIconInput.value || '';
    const initialQuery = inferIconPickerQuery(currentValue);

    iconPickerDialog.classList.remove('hidden');
    iconPickerSearch.value = initialQuery;
    renderIconPickerResults(initialQuery);
    if (!iconPickerCatalog.length) {
        loadIconPickerCatalog();
    }
    iconPickerSearch.focus();
}

function closeIconPicker() {
    if (!iconPickerDialog) {
        return;
    }

    iconPickerDialog.classList.add('hidden');
}

function openEditDialog(isNew = false) {
    if (selectedPos === null) return;

    const selectedData = catalogToUse[selectedPos];

    editIsNew = isNew;
    editSnapshotUnsavedChanges = UnsavedChanges;
    editSnapshot = { name: selectedData.name, addr: selectedData.addr, icon: selectedData.icon };

    document.getElementById('editName').value = selectedData.name;
    document.getElementById('editAddr').value = selectedData.addr;
    editIconInput.value = selectedData.icon || (selectedData.addr !== 'separator' ? DEFAULT_ICON : '');
    updateIconPreview(editIconInput.value);

    if (selectedData.addr === 'separator') {
        editFormAddress.classList.add('hidden');
    } else {
        editFormAddress.classList.remove('hidden');
    }
    isEditDialogOpen = true;
    editDialog.classList.remove('hidden');
    updateBackgroundOverlayVisibility();
}

function cancelEditDialog() {
    if (editIsNew) {
        // Cancelar inserción: eliminar el elemento recién creado
        catalogToUse.splice(selectedPos, 1);
        selectedPos = null;
        UnsavedChanges = editSnapshotUnsavedChanges;
        actualizarVista();
        highlightSelected();
    } else if (editSnapshot) {
        // Revertir cambios sobre elemento existente
        const selectedData = catalogToUse[selectedPos];
        selectedData.name = editSnapshot.name;
        selectedData.addr = editSnapshot.addr;
        selectedData.icon = editSnapshot.icon;
        UnsavedChanges = editSnapshotUnsavedChanges;
        actualizarVista();
        highlightSelected();
    }
    closeEditDialog();
}

saveEditButton.addEventListener('click', () => {
    if (selectedPos === null) return;

    const selectedData = catalogToUse[selectedPos];
    if (!selectedData) return;

    selectedData.name = document.getElementById('editName').value;
    selectedData.addr = document.getElementById('editAddr').value;
    selectedData.icon = editIconInput.value;

    UnsavedChanges = true;
    actualizarVista();
    highlightSelected();
    closeEditDialog();
});


cancelEditButton.addEventListener('click', cancelEditDialog);
openIconPickerButton.addEventListener('click', openIconPicker);
closeIconPickerButton.addEventListener('click', closeIconPicker);
iconPickerSearch.addEventListener('input', (event) => renderIconPickerResults(event.target.value));
editIconInput.addEventListener('input', (event) => updateIconPreview(event.target.value));

document.addEventListener('click', (event) => {
    if (iconPickerDialog.classList.contains('hidden')) {
        return;
    }

    if (event.target.closest('#iconPickerDialog') || event.target.closest('#openIconPickerButton')) {
        return;
    }

    closeIconPicker();
});

// Extraer clases cuando se pega código HTML de FontAwesome
editIconInput.addEventListener('paste', function(event) {
    event.preventDefault();

    // Obtener el texto pegado del portapapeles
    const pastedText = (event.clipboardData || window.clipboardData).getData('text');

    // Regex para detectar el formato <i class="..."></i>
    const regex = /<i\s+class=["']([^"']+)["'][^>]*><\/i>/i;
    const match = pastedText.match(regex);

    if (match && match[1]) {
        // Si coincide el formato, extraer solo las clases
        this.value = match[1];
    } else {
        // Si no coincide, pegar el texto tal cual
        this.value = pastedText;
    }

    updateIconPreview(this.value);
});

function closeEditDialog() {
    isEditDialogOpen = false;
    closeIconPicker();
    editDialog.classList.add('hidden');
    updateBackgroundOverlayVisibility();
}

function moveElement(index, direction) {
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
        highlightSelected();
    }
}

function removeElement() {
    UnsavedChanges = true;
    if (selectedPos === null) return;

    catalogToUse.splice(selectedPos, 1);

    // Actualizar la vista
    actualizarVista();
    selectedPos = null;
    highlightSelected();
}

function duplicateElement() {
    if (selectedPos === null) return;
    const source = catalogToUse[selectedPos];
    const copyName = buildCopyName(source.name);
    addNewElement(source.addr, copyName, source.icon);
    // Para separadores, addNewElement no abre el diálogo; forzarlo aquí
    if (source.addr === 'separator') {
        openEditDialog(true);
    }
}

function buildCopyName(name) {
    const copyNRegex = /^(.*)\(copy(?: (\d+))?\)$/;
    const match = name.match(copyNRegex);
    if (!match) {
        return name + ' (copy)';
    }
    const base = match[1];
    const n = match[2] ? parseInt(match[2], 10) : 1;
    return base + '(copy ' + (n + 1) + ')';
}

function addNewElement(newAddr, newName, newIcon) {
    UnsavedChanges = true;
    const newElement = {
        addr: newAddr,
        name: newName,
        icon: newIcon
    };

    // Determinar la posición en la que se insertará el nuevo elemento
    let insertPos;
    if (selectedPos !== null) {
        insertPos = selectedPos + 1;
    } else if (newAddr !== 'separator') {
        // Sin selección: insertar tras el último Link (no Separator)
        const lastLinkIndex = catalogToUse.reduce(
            (last, item, i) => (item.addr !== 'separator' ? i : last), -1
        );
        insertPos = lastLinkIndex !== -1 ? lastLinkIndex + 1 : catalogToUse.length;
    } else {
        insertPos = catalogToUse.length;
    }

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
    highlightSelected();

    if (newElement.addr !== 'separator') {
        openEditDialog(true);
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

// Procesamiento de parámetros de URL para añadir/editar marcadores externamente
// Uso: ?url=https://ejemplo.com&name=Nombre&icon=fas%20fa-star
function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');

    if (!urlParam) return;

    const nameParam = params.get('name') || '';
    const iconParam = params.get('icon') || '';

    // Limpiar los parámetros de la URL sin recargar la página
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);

    // Buscar si la URL ya existe en el catálogo
    const existingIndex = catalogToUse.findIndex(
        item => item.addr === urlParam
    );

    setEditMode(true);

    if (existingIndex !== -1) {
        // El marcador ya existe: seleccionarlo y actualizar campos si se proporcionaron
        selectedPos = existingIndex;
        highlightSelected();
        if (nameParam) catalogToUse[existingIndex].name = nameParam;
        if (iconParam) catalogToUse[existingIndex].icon = iconParam;
        if (nameParam || iconParam) UnsavedChanges = true;
        openEditDialog();
    } else {
        // El marcador no existe: crearlo (addNewElement selecciona y abre el editor)
        const newName = nameParam || urlParam;
        const newIcon = iconParam || '';
        addNewElement(urlParam, newName, newIcon);
    }
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

