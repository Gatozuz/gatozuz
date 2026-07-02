const API_URL = 'https://fortnite-api.com/v2/shop?language=es';
let articulosSeleccionados = [];

// ---------- Cronómetros ----------
function getTargetResetTimestamp() {
    const now = new Date();
    const reset = new Date();
    reset.setUTCHours(0, 0, 0, 0);
    if (now >= reset) {
        reset.setUTCDate(reset.getUTCDate() + 1);
    }
    return reset.getTime();
}

function startGlobalCountdown() {
    const timerElement = document.getElementById('global-shop-timer');
    if (!timerElement) return;

    const targetTime = getTargetResetTimestamp();

    const interval = setInterval(() => {
        const now = Date.now();
        const timeDiff = targetTime - now;

        if (timeDiff <= 0) {
            timerElement.textContent = "Nuevos artículos: ¡Disponibles ahora!";
            clearInterval(interval);
            return;
        }

        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        timerElement.innerHTML = `Nuevos artículos en <span style="display: inline-block; width: 85px; text-align: left; font-variant-numeric: tabular-nums;">${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</span>`;
    }, 1000);
}

function startIndividualCountdowns() {
    setInterval(() => {
        document.querySelectorAll('.item-countdown').forEach(el => {
            const exitTimestampStr = el.getAttribute('data-exit-date');
            if (!exitTimestampStr) return;

            const targetTime = parseInt(exitTimestampStr, 10);
            if (isNaN(targetTime)) return;

            const nowTime = Date.now();
            const timeDiff = targetTime - nowTime;

            if (timeDiff <= 0) {
                el.textContent = "¡Rotado!";
                el.classList.add('urgent');
                return;
            }

            const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

            if (days > 0) {
                el.textContent = `${days}d ${hours}h ${minutes}m`;
                el.classList.remove('urgent');
            } else {
                el.textContent = `${hours}h ${String(minutes).padStart(2, '0')}m`;
                el.classList.add('urgent');
            }
        });
    }, 1000 * 15);
}

// ---------- Filtros laterales ----------
function createSidebarFilters(orderedSections) {
    const sidebar = document.querySelector('.shop-sidebar-filters');
    if (!sidebar) return;

    sidebar.innerHTML = '';

    orderedSections.forEach((sectionTitle, index) => {
        const btn = document.createElement('button');
        btn.classList.add('filter-btn');

        let displayTitle = sectionTitle;
        if (sectionTitle === 'COMPÁS CAÑERO') displayTitle = 'BEATS DE BATALLA';
        if (sectionTitle === 'NO HAY PROBLEMA') displayTitle = 'NO TE PREOCUPES';
        if (sectionTitle === 'OTROS ARTÍCULOS') displayTitle = 'DESTACADOS';

        btn.textContent = displayTitle;
        if (index === 0) btn.classList.add('active');

        btn.addEventListener('click', () => {
            // --- 1. NUEVA LÓGICA: Limpiar el buscador ---
            const searchInput = document.querySelector('.search-input');
            if (searchInput && searchInput.value.trim() !== '') {
                searchInput.value = ''; // Borra el texto ingresado
                searchInput.dispatchEvent(new Event('input')); // Dispara el evento de búsqueda para mostrar todo de nuevo
            }
            // --------------------------------------------

            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // --- 2. NUEVA LÓGICA: Retraso para el Scroll ---
            // Usamos setTimeout para darle al navegador unos milisegundos 
            // para volver a "dibujar" las secciones que estaban ocultas antes de viajar a ellas
            setTimeout(() => {
                const targetSection = document.getElementById(`section-${sectionTitle.replace(/\s+/g, '-')}`);
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 50);

            if (window.innerWidth <= 1024) {
                document.querySelector('.shop-sidebar-filters').style.display = 'none';
            }
        });

        sidebar.appendChild(btn);
    });
}

// ---------- Traducción rareza ----------
function conducirTraduccionRareza(raridadOriginal) {
    if (!raridadOriginal) return "COMÚN";
    const label = raridadOriginal.toLowerCase().trim();
    if (label === 'common' || label === 'común') return 'COMÚN';
    if (label === 'uncommon' || label === 'poco común' || label === 'poco comun') return 'POCO COMÚN';
    if (label === 'rare' || label === 'raro') return 'RARO';
    if (label === 'epic' || label === 'épico' || label === 'epico') return 'ÉPICO';
    if (label === 'legendary' || label === 'legendario') return 'LEGENDARIO';
    if (label === 'icon' || label === 'icon series' || label === 'ídolos') return 'SERIE DE ÍDOLOS';
    if (label === 'marvel') return 'MARVEL';
    if (label === 'dc' || label === 'dark knight') return 'DC';
    if (label === 'star wars' || label === 'starwars') return 'STAR WARS';
    if (label === 'gaming legends' || label === 'gaminglegends') return 'LEYENDAS DE VIDEOJUEGOS';
    if (label === 'lava' || label === 'lava series') return 'SERIE DE LAVA';
    if (label === 'frozen' || label === 'frozen series') return 'SERIE CONGELADA';
    if (label === 'shadow' || label === 'shadow series') return 'SERIE DE SOMBRAS';
    return raridadOriginal.toUpperCase();
}

// ---------- Cargar tienda Fortnite ----------
async function getFortniteShop() {
    const container = document.getElementById('shop-container');
    const dateElement = document.getElementById('shop-date');
    if (!container) return;
    container.innerHTML = '<div class="loading">Sincronizando catálogo...</div>';

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`Error de red: ${response.status}`);

        const json = await response.json();
        if (!json || json.status !== 200 || !json.data || !json.data.entries) {
            throw new Error('Estructura de la tienda no válida.');
        }

        container.innerHTML = '';
        let entries = json.data.entries.filter(entry => {
            const category = (entry.layout?.category || "").toLowerCase();
            return !category.includes('lego') && !category.includes('juno');
        });

        const hoy = new Date();
        if (dateElement) {
            dateElement.textContent = `Catálogo en Vivo: ${hoy.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
            let timerElement = document.getElementById('global-shop-timer');
            if (!timerElement) {
                timerElement = document.createElement('div');
                timerElement.id = 'global-shop-timer';
                
                // 👇 AGREGA ESTA LÍNEA EXACTAMENTE AQUÍ 👇
                timerElement.style.fontFamily = "'Barlow', sans-serif";
                
                timerElement.style.fontSize = '1.15rem';
                timerElement.style.fontWeight = 'bold';
                timerElement.style.color = '#ff9800';
                timerElement.style.marginTop = '10px';
                timerElement.style.letterSpacing = '0.5px';
                timerElement.style.textAlign = 'center';
                timerElement.style.width = '100%';
                timerElement.style.display = 'block';
                dateElement.parentNode.insertBefore(timerElement, dateElement.nextSibling);
            }
        }

        startGlobalCountdown();

        const sectionsMap = {};
        const sectionRanks = {};

        entries.forEach(entry => {
            let sectionName = entry.layout?.name || entry.layout?.category || "Otros Artículos";
            const nombreSeccionMinuscula = sectionName.toLowerCase();

            if (nombreSeccionMinuscula === 'beats de batalla') sectionName = 'COMPÁS CAÑERO';
            if (nombreSeccionMinuscula === 'botines de fortnite') sectionName = 'BOTÍN DE FORTNITE';
            if (nombreSeccionMinuscula === 'no te preocupes') sectionName = 'NO HAY PROBLEMA';
            if (nombreSeccionMinuscula === 'listo para el combate') sectionName = 'PUESTA A PUNTO';

            if (!sectionsMap[sectionName]) {
                sectionsMap[sectionName] = [];
                sectionRanks[sectionName] = entry.layout?.rank ?? -9999;
            } else {
                if (entry.layout?.rank !== undefined && entry.layout.rank > sectionRanks[sectionName]) {
                    sectionRanks[sectionName] = entry.layout.rank;
                }
            }
            sectionsMap[sectionName].push(entry);
        });

        const orderedSectionNames = Object.keys(sectionsMap).sort((a, b) => sectionRanks[b] - sectionRanks[a]);
        const activeSections = orderedSectionNames.filter(name => sectionsMap[name] && sectionsMap[name].length > 0);
        createSidebarFilters(activeSections);

        orderedSectionNames.forEach(sectionTitle => {
            if (!sectionsMap[sectionTitle] || sectionsMap[sectionTitle].length === 0) return;

            const sectionElement = document.createElement('section');
            sectionElement.classList.add('shop-section');
            sectionElement.id = `section-${sectionTitle.replace(/\s+/g, '-')}`;

            const titleElement = document.createElement('h2');
            titleElement.classList.add('section-title');
            titleElement.textContent = sectionTitle;
            sectionElement.appendChild(titleElement);

            const gridElement = document.createElement('div');
            gridElement.classList.add('section-grid');

            const listaArticulosOrdenados = sectionsMap[sectionTitle].sort((a, b) => {
                const indexA = (a.layout && a.layout.index !== undefined) ? a.layout.index : 999;
                const indexB = (b.layout && b.layout.index !== undefined) ? b.layout.index : 999;
                if (indexA !== indexB) return indexA - indexB;
                const precioA = a.finalPrice || 0;
                const precioB = b.finalPrice || 0;
                return precioB - precioA;
            });

            let sectionColorA = null, sectionColorB = null, sectionBgUrl = null;

            for (const entry of listaArticulosOrdenados) {
                if (entry.colors && (entry.colors.color1 || entry.colors.color2)) {
                    sectionColorA = entry.colors.color1;
                    sectionColorB = entry.colors.color2 || entry.colors.color3 || entry.colors.color1;
                    if (sectionColorA || sectionColorB) break;
                }

                if (entry.newDisplayAsset && entry.newDisplayAsset.materialInstances) {
                    for (const mi of entry.newDisplayAsset.materialInstances) {
                        if (mi.colors) {
                            const keys = Object.keys(mi.colors);
                            const keyA = keys.find(k => {
                                const lower = k.toLowerCase();
                                return lower.includes('color_a') || lower.includes('color_1') || lower === 'color1' || lower.includes('backgroundcolora') || lower === 'background';
                            });
                            const keyB = keys.find(k => {
                                const lower = k.toLowerCase();
                                return lower.includes('color_b') || lower.includes('color_2') || lower === 'color2' || lower.includes('backgroundcolorb') || lower.includes('fallback');
                            });
                            if (keyA && mi.colors[keyA]) sectionColorA = mi.colors[keyA];
                            if (keyB && mi.colors[keyB]) sectionColorB = mi.colors[keyB];
                        }
                        if (mi.images) {
                            const imgKeys = Object.keys(mi.images);
                            const bgKey = imgKeys.find(k => k.toLowerCase().includes('background'));
                            if (bgKey && mi.images[bgKey]) sectionBgUrl = mi.images[bgKey];
                        }
                        if (sectionColorA || sectionColorB) break;
                    }
                }
                if (sectionColorA || sectionColorB) break;
            }

            if (!sectionColorA && !sectionColorB) {
                for (const entry of listaArticulosOrdenados) {
                    const item = entry.items?.[0] || entry.brItems?.[0];
                    if (item && item.series && item.series.colors && item.series.colors.length > 0) {
                        sectionColorA = item.series.colors[0];
                        if (item.series.colors.length >= 2) sectionColorB = item.series.colors[1];
                        break;
                    }
                }
            }

            if (sectionColorA && !sectionColorB) sectionColorB = sectionColorA;
            if (!sectionColorA && sectionColorB) sectionColorA = sectionColorB;

            listaArticulosOrdenados.forEach(entry => {
                const item = entry.items && entry.items.length > 0 ? entry.items[0] : null;
                const brItem = entry.brItems && entry.brItems.length > 0 ? entry.brItems[0] : null;
                const esLote = entry.bundle !== undefined && entry.bundle !== null;
                const esMusica = entry.tracks && entry.tracks.length > 0;

                if (!item && !brItem && !entry.newDisplayAsset && !esMusica && !esLote) return;

                let name = "Objeto Especial";
                if (esLote) {
                    name = entry.bundle.name || entry.devName || "Lote Especial";
                } else if (esMusica) {
                    name = entry.tracks[0].title;
                } else {
                    name = entry.brItems?.[0]?.name || item?.name || entry.devName || "Objeto Especial";
                }
                if (name.includes('[VIRTUAL]')) name = name.replace(/\[VIRTUAL\]\s*\d+\s*x\s*/i, '').split(' for ')[0].trim();

                let especieTexto = "OBJETO";
                const currentObj = item || brItem;
                if (esLote) {
                    especieTexto = "LOTE";
                } else if (esMusica) {
                    especieTexto = "PISTA DE IMPROVISACIÓN";
                } else if (currentObj) {
                    const typeId = (currentObj.type?.id || "").toLowerCase();
                    const backendType = (currentObj.type?.backendValue || "").toLowerCase();
                    const displayValue = (currentObj.type?.displayValue || "").toLowerCase();
                    if (typeId.includes("pickaxe") || backendType.includes("pickaxe") || displayValue.includes("pico") || displayValue.includes("herramienta")) {
                        especieTexto = "PICO";
                    } else if (typeId.includes("backpack") || backendType.includes("backpack") || displayValue.includes("mochila") || displayValue.includes("retro")) {
                        especieTexto = "MOCHILA";
                    } else if (typeId.includes("outfit") || backendType.includes("character") || displayValue.includes("atuendo") || displayValue.includes("traje") || displayValue.includes("skin")) {
                        especieTexto = "ATUENDO";
                    } else if (typeId.includes("emote") || backendType.includes("dance") || displayValue.includes("gesto") || displayValue.includes("baile")) {
                        especieTexto = "GESTO";
                    } else if (typeId.includes("glider") || displayValue.includes("planeador")) {
                        especieTexto = "ALA DELTA";
                    } else if (typeId.includes("pet") || backendType.includes("pet") || displayValue.includes("compañero")) {
                        especieTexto = "COMPAÑERO";
                    } else if (typeId.includes("wrap") || displayValue.includes("envoltorio") || displayValue.includes("papel")) {
                        especieTexto = "ENVOLTORIO";
                    } else if (displayValue) {
                        especieTexto = displayValue.toUpperCase();
                    }
                }

                const pricevbucks = entry.finalPrice !== undefined ? entry.finalPrice : 0;
                let precioSolesTexto = "---";
                if (pricevbucks > 0) {
                    const calculoSoles = (pricevbucks / 100) * 1.20;
                    precioSolesTexto = `S/ ${calculoSoles.toFixed(2)}`;
                }
                const displayPriceVbucks = pricevbucks > 0 ? pricevbucks : "---";
                const rawRarity = item?.rarity?.value || brItem?.rarity?.value || "Común";
                const rarityText = conducirTraduccionRareza(rawRarity);

                let itemTargetTimestamp = 0;
                const rawApiDate = entry.absoluteExpirationDate || entry.expirationDate || entry.outDate || entry.expiryDate;
                if (rawApiDate) {
                    itemTargetTimestamp = Date.parse(rawApiDate);
                }

                const fechaEsInvalidaOPasada = (!itemTargetTimestamp || isNaN(itemTargetTimestamp) || itemTargetTimestamp <= Date.now());
                const initDiff = itemTargetTimestamp - Date.now();
                let initText = "0h 00m";
                let claseUrgente = "urgent";
                if (initDiff > 0) {
                    const initDays = Math.floor(initDiff / (1000 * 60 * 60 * 24));
                    const initHours = Math.floor((initDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const initMinutes = Math.floor((initDiff % (1000 * 60 * 60)) / (1000 * 60));
                    if (initDays > 0) {
                        initText = `${initDays}d ${initHours}h ${initMinutes}m`;
                        claseUrgente = "";
                    } else {
                        initText = `${initHours}h ${String(initMinutes).padStart(2, '0')}m`;
                        claseUrgente = "urgent";
                    }
                }

                let allImages = [];
                let imagenCuerpoCompleto = null;
                if (entry.newDisplayAsset && entry.newDisplayAsset.materialInstances) {
                    const matImages = entry.newDisplayAsset.materialInstances[0]?.images;
                    if (matImages && matImages.OfferImage) {
                        imagenCuerpoCompleto = matImages.OfferImage;
                    }
                }

                if (entry.newDisplayAsset && entry.newDisplayAsset.renderImages) {
                    allImages = entry.newDisplayAsset.renderImages
                        .filter(imgObj => {
                            const tag = (imgObj.productTag || "").toLowerCase();
                            const url = (imgObj.image || "").toLowerCase();
                            return !tag.includes('juno') && !tag.includes('lego') && !url.includes('juno') && !url.includes('lego');
                        })
                        .map(imgObj => imgObj.image)
                        .filter(imgUrl => imgUrl);
                }

                if (imagenCuerpoCompleto) {
                    allImages = allImages.filter(img => img !== imagenCuerpoCompleto);
                    allImages.unshift(imagenCuerpoCompleto);
                }

                if (allImages.length === 0 && esLote && entry.bundle?.image) {
                    allImages.push(entry.bundle.image);
                }

                if (allImages.length === 0 && esMusica && entry.tracks[0].albumArt) {
                    allImages.push(entry.tracks[0].albumArt);
                }

                if (allImages.length === 0) {
                    const backupObj = item || brItem;
                    if (backupObj && backupObj.images) {
                        const urlsToProcess = [backupObj.images.featured, backupObj.images.icon, backupObj.images.smallIcon];
                        const validUrl = urlsToProcess.find(imgUrl => imgUrl && !imgUrl.toLowerCase().includes('lego') && !imgUrl.toLowerCase().includes('juno'));
                        if (validUrl) allImages.push(validUrl);
                    }
                }

                if (allImages.length === 0) return;

                const esArticuloNuevo = (entry.isNew === true) ||
                    (entry.banner && (entry.banner.value?.toLowerCase() === 'new' || entry.banner.value?.toLowerCase() === 'nuevo')) ||
                    (entry.newDisplayAsset && entry.newDisplayAsset.id && entry.newDisplayAsset.id.includes('new'));

                const nuevoHTML = esArticuloNuevo ? `<span class="item-new-tag">¡NUEVO!</span>` : '';

                let cardColorA = sectionColorA;
                let cardColorB = sectionColorB;

                if (!cardColorA || !cardColorB) {
                    const rawRarityValue = (item?.rarity?.value || brItem?.rarity?.value || "common").toLowerCase();
                    let rarityColorA = "#5a646c";
                    let rarityColorB = "#20262b";

                    if (rawRarityValue === 'uncommon') { rarityColorA = "#60aa3a"; rarityColorB = "#175117"; }
                    else if (rawRarityValue === 'rare') { rarityColorA = "#49abd1"; rarityColorB = "#143977"; }
                    else if (rawRarityValue === 'epic') { rarityColorA = "#b15be2"; rarityColorB = "#4b1e70"; }
                    else if (rawRarityValue === 'legendary') { rarityColorA = "#d37841"; rarityColorB = "#7a310d"; }
                    else if (rawRarityValue === 'icon' || rawRarityValue === 'icon series') { rarityColorA = "#36b2b1"; rarityColorB = "#114649"; }
                    else if (rawRarityValue === 'marvel') { rarityColorA = "#ed1c24"; rarityColorB = "#5c0a0c"; }
                    else if (rawRarityValue === 'starwars' || rawRarityValue === 'star wars') { rarityColorA = "#17233f"; rarityColorB = "#03081b"; }
                    else if (rawRarityValue === 'dc') { rarityColorA = "#506883"; rarityColorB = "#16202c"; }
                    else if (rawRarityValue === 'gaminglegends' || rawRarityValue === 'gaming legends') { rarityColorA = "#443a75"; rarityColorB = "#1b1136"; }
                    else if (rawRarityValue === 'slurp' || rawRarityValue === 'slurp series') { rarityColorA = "#00e1ff"; rarityColorB = "#0064ff"; }
                    else if (rawRarityValue === 'shadow' || rawRarityValue === 'shadow series') { rarityColorA = "#4a4a4a"; rarityColorB = "#121212"; }
                    else if (rawRarityValue === 'frozen' || rawRarityValue === 'frozen series') { rarityColorA = "#a6f3ff"; rarityColorB = "#3b96ab"; }
                    else if (rawRarityValue === 'lava' || rawRarityValue === 'lava series') { rarityColorA = "#ff7a00"; rarityColorB = "#8a1600"; }
                    else if (rawRarityValue === 'dark' || rawRarityValue === 'dark series') { rarityColorA = "#c64df0"; rarityColorB = "#3d1152"; }

                    cardColorA = rarityColorA;
                    cardColorB = rarityColorB;
                }

                const formatColor = (c) => {
                    if (!c) return '#20262b';
                    let cleanColor = c.replace('#', '');
                    if (cleanColor.length >= 8) cleanColor = cleanColor.substring(0, 6);
                    return `#${cleanColor}`;
                };

                let fallbackBackground = `linear-gradient(180deg, ${formatColor(cardColorA)} 0%, ${formatColor(cardColorB)} 100%)`;

                let apiBgUrl = sectionBgUrl;
                if (!apiBgUrl) {
                    if (entry.newDisplayAsset?.materialInstances?.[0]?.images?.Background) {
                        apiBgUrl = entry.newDisplayAsset.materialInstances[0].images.Background;
                    } else if (entry.newDisplayAsset?.materialInstances?.[0]?.images?.background) {
                        apiBgUrl = entry.newDisplayAsset.materialInstances[0].images.background;
                    } else if (currentObj?.images?.background) {
                        apiBgUrl = currentObj.images.background;
                    } else if (item?.images?.background) {
                        apiBgUrl = item.images.background;
                    } else if (brItem?.images?.background) {
                        apiBgUrl = brItem.images.background;
                    }
                }

                let finalBackgroundStyle = `background: ${fallbackBackground};`;
                if (apiBgUrl) {
                    finalBackgroundStyle = `background: url('${apiBgUrl}') center/cover no-repeat, ${fallbackBackground};`;
                }

                const card = document.createElement('div');
                card.classList.add('item-card');

                let countdownHTML = '';
                if (fechaEsInvalidaOPasada) {
                    countdownHTML = '';
                } else {
                    countdownHTML = `<span class="item-countdown ${claseUrgente}" data-exit-date="${itemTargetTimestamp}">${initText}</span>`;
                }

                let imagesHTML = allImages.map((imgUrl, i) => {
                    let extraStyle = i === 0
                        ? "opacity: 1; transition: opacity 0.8s ease;"
                        : "position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 0.8s ease;";
                    return `<img src="${imgUrl}" alt="${name}" class="item-image cycle-img" style="${extraStyle}" loading="lazy">`;
                }).join('');

                card.innerHTML = `
                    <div class="card-image-wrapper">
                        <div class="api-bg-layer" style="${finalBackgroundStyle}"></div>
                        ${countdownHTML}
                        ${nuevoHTML}
                        ${imagesHTML}
                        <h3 class="item-name" title="${name}"></h3>
                    </div>
                    <div class="item-info">
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            <span style="font-size: 0.75rem; font-weight: bold; color: #718096; letter-spacing: 0.5px; text-transform: uppercase;">${rarityText}</span>
                            <span style="font-size: 0.75rem; font-weight: bold; color: #4a5568; letter-spacing: 0.5px; text-transform: uppercase;">${especieTexto}</span>
                        </div>
                        <div class="item-footer">
                            <span class="item-price"><span class="vbucks-icon"></span> ${displayPriceVbucks}</span>
                            <span class="item-price-soles">${precioSolesTexto}</span>
                        </div>
                        <button class="btn-anadir-carrito">
                            <svg viewBox="0 0 24 24" class="cart-icon"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
                            Añadir Carrito
                        </button>
                    </div>
                `;

                card.querySelector('.item-name').textContent = name;

                const btnCarrito = card.querySelector('.btn-anadir-carrito');
                const datosArticulo = {
                    tipo: especieTexto,
                    nombre: name,
                    vbucks: displayPriceVbucks,
                    soles: pricevbucks > 0 ? ((pricevbucks / 100) * 1.20) : 0
                };

                btnCarrito.addEventListener('click', (event) => {
                    event.stopPropagation();

                    if (card.classList.contains('seleccionado')) {
                        card.classList.remove('seleccionado');
                        btnCarrito.style.backgroundColor = '';
                        articulosSeleccionados = articulosSeleccionados.filter(item => item.nombre !== datosArticulo.nombre);
                    } else {
                        if (articulosSeleccionados.length < 15) {
                            card.classList.add('seleccionado');
                            btnCarrito.style.backgroundColor = '#ff7b00';
                            articulosSeleccionados.push(datosArticulo);
                        } else {
                            alert("¡Solo puedes seleccionar un máximo de 15 artículos!");
                        }
                    }
                    actualizarWhatsapp();
                });

                gridElement.appendChild(card);
            });

            if (gridElement.children.length > 0) {
                sectionElement.appendChild(gridElement);
                container.appendChild(sectionElement);
            }
        });

        startIndividualCountdowns();

        // Ciclo de imágenes
        setInterval(() => {
            document.querySelectorAll('.card-image-wrapper').forEach(wrapper => {
                const imgs = wrapper.querySelectorAll('.cycle-img');
                if (imgs.length > 1) {
                    let currentIdx = Array.from(imgs).findIndex(img => img.style.opacity === '1');
                    if (currentIdx === -1) currentIdx = 0;
                    imgs[currentIdx].style.opacity = '0';
                    let nextIdx = (currentIdx + 1) % imgs.length;
                    imgs[nextIdx].style.opacity = '1';
                }
            });
        }, 3500);

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="loading">⚠️ Error al sincronizar el catálogo de la tienda.</div>`;
    }
}

// ---------- Inicialización ----------
document.addEventListener('DOMContentLoaded', () => {
    getFortniteShop();

    const sidebarFilters = document.querySelector('.shop-sidebar-filters');
    const toggleBtn = document.querySelector('.filters-header');
    const whatsappBtn = document.getElementById('whatsapp-btn');

    function checkScreenSize() {
        if (!sidebarFilters) return;
        if (window.innerWidth <= 1024) {
            sidebarFilters.style.display = 'none';
        } else {
            sidebarFilters.style.display = 'block';
        }
    }

    if (sidebarFilters) {
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
    }

    if (toggleBtn && sidebarFilters) {
        toggleBtn.addEventListener('click', () => {
            if (sidebarFilters.style.display === 'none' || sidebarFilters.style.display === '') {
                sidebarFilters.style.display = 'block';
            } else {
                sidebarFilters.style.display = 'none';
            }
        });
    }
});

// ---------- Actualizar WhatsApp con el tipo dentro del paréntesis ----------
function actualizarWhatsapp() {
    const btn = document.getElementById('whatsapp-btn');
    const previewContenedor = document.getElementById('floating-total-preview');
    const textSoles = document.getElementById('preview-soles');

    let totalSoles = 0;
    let totalVbucks = 0;

    if (articulosSeleccionados.length > 0 && articulosSeleccionados.length <= 15) {
        let mensajeTexto = "Hola, deseo comprar lo sgte:\n\n";

        articulosSeleccionados.forEach(art => {
            totalSoles += art.soles;
            totalVbucks += parseInt(art.vbucks) || 0;
            
            let etiquetaTipo = art.tipo;
            
            // Acortamos si es pista de improvisación
            if (etiquetaTipo === "PISTA DE IMPROVISACIÓN") {
                etiquetaTipo = "CANCIÓN";
            }
            
            // CAMBIO AQUÍ: Ahora el tipo va al costado de los pavos, dentro del paréntesis
            mensajeTexto += `${art.nombre} (${art.vbucks} - ${etiquetaTipo})\n`;
        });

        mensajeTexto += `\nTOTAL ${totalVbucks} = S/ ${totalSoles.toFixed(2)}`;

        if (btn) {
            btn.href = `https://wa.me/51908782069?text=${encodeURIComponent(mensajeTexto)}`;
            btn.classList.add('latido-activo');
            btn.style.opacity = "1";
            btn.style.pointerEvents = "auto";
        }

        if (previewContenedor && textSoles) {
            previewContenedor.classList.add('activo');
            textSoles.textContent = `PEN ${totalSoles.toFixed(2).replace('.', ',')}`;
        }

    } else {
        if (btn) {
            btn.href = "#";
            btn.classList.remove('latido-activo');
        }
        if (previewContenedor) {
            previewContenedor.classList.remove('activo');
        }
    }
}

// ---------- Modal carrito vacío ----------
document.addEventListener('DOMContentLoaded', () => {
    const whatsappBtn = document.getElementById('whatsapp-btn');
    const modalOverlay = document.getElementById('modal-carrito-vacio');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');

    if (whatsappBtn && modalOverlay && btnCerrarModal) {
        whatsappBtn.addEventListener('click', (e) => {
            if (articulosSeleccionados.length === 0) {
                e.preventDefault();
                modalOverlay.classList.add('activo');
            } else {
                setTimeout(() => {
                    articulosSeleccionados = [];
                    document.querySelectorAll('.item-card.seleccionado').forEach(card => {
                        card.classList.remove('seleccionado');
                        const btn = card.querySelector('.btn-anadir-carrito');
                        if (btn) btn.style.backgroundColor = '';
                    });
                    actualizarWhatsapp();
                }, 500);
            }
        });

        btnCerrarModal.addEventListener('click', () => {
            modalOverlay.classList.remove('activo');
        });

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.classList.remove('activo');
            }
        });
    }
});

// ---------- Búsqueda ----------
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-input');
    const shopContainer = document.getElementById('shop-container');

    if (searchInput && shopContainer) {
        searchInput.addEventListener('input', (evento) => {
            const textoBusqueda = evento.target.value.toLowerCase();
            const articulos = shopContainer.querySelectorAll('.item-card');

            articulos.forEach((articulo) => {
                const textoArticulo = articulo.textContent.toLowerCase();
                articulo.style.display = textoArticulo.includes(textoBusqueda) ? '' : 'none';
            });

            const titulosCategorias = shopContainer.querySelectorAll('h1, h2, h3, h4, h5');
            titulosCategorias.forEach((titulo) => {
                if (!titulo.closest('.item-card')) {
                    titulo.style.display = textoBusqueda.length > 0 ? 'none' : '';
                }
            });

            const contenedoresPadre = new Set();
            articulos.forEach(articulo => {
                if (articulo.parentElement && articulo.parentElement !== shopContainer) {
                    contenedoresPadre.add(articulo.parentElement);
                }
            });

            contenedoresPadre.forEach(contenedor => {
                const articulosVisibles = Array.from(contenedor.querySelectorAll('.item-card')).filter(art => art.style.display !== 'none');
                if (textoBusqueda.length > 0) {
                    if (articulosVisibles.length === 0) {
                        contenedor.style.display = 'none';
                        if (contenedor.parentElement && (contenedor.parentElement.tagName === 'SECTION' || contenedor.parentElement.classList.contains('shop-section'))) {
                            contenedor.parentElement.style.display = 'none';
                        }
                    } else {
                        contenedor.style.display = '';
                        if (contenedor.parentElement && (contenedor.parentElement.tagName === 'SECTION' || contenedor.parentElement.classList.contains('shop-section'))) {
                            contenedor.parentElement.style.display = '';
                        }
                    }
                } else {
                    contenedor.style.display = '';
                    if (contenedor.parentElement && (contenedor.parentElement.tagName === 'SECTION' || contenedor.parentElement.classList.contains('shop-section'))) {
                        contenedor.parentElement.style.display = '';
                    }
                }
            });
        });
    }
});

// ---------- Barra de Búsqueda Fija (Sticky) con JS ----------
document.addEventListener('DOMContentLoaded', () => {
    const searchContainer = document.querySelector('.search-container');
    
    if (searchContainer) {
        // 1. Aplicamos las propiedades de fijación directamente vía JS
        searchContainer.style.position = '-webkit-sticky'; // Compatibilidad extra
        searchContainer.style.position = 'sticky';
        searchContainer.style.top = '15px';
        searchContainer.style.zIndex = '990';
        searchContainer.style.transition = 'box-shadow 0.3s ease'; // Animación suave
        
        // 2. Escuchamos el scroll de la página para añadir efectos visuales
        window.addEventListener('scroll', () => {
            // Si el usuario baja más de 40 píxeles, aparece la sombra
            if (window.scrollY > 40) {
                searchContainer.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.9)';
            } else {
                // Si regresa arriba, la sombra desaparece
                searchContainer.style.boxShadow = 'none';
            }
        });
    }
});