/**
 * Casa 25 - App Strategy & Logic
 */

// --- State Management ---
const state = {
    role: 'guest', // 'admin' or 'guest'
    isAuthenticated: false, // Login enabled
    adminPins: ['1016033125', '1016101547', '1012405707', '1102372306'],
    reservation: {
        huespedNombre: 'Manuela',
        codigoPuerta: '0008505#',
        guestPin: '8505',
        checkIn: '2026-01-30T15:00',
        checkOut: '2026-02-01T13:00',
        huespedesMax: 3,
        mascotasPermitidas: 'Sí (Bajo reglas)',
        feedback: '',
        issues: [],
        welcomeNotified: false,
        sunsetNotified: false,
        quietHoursNotified: false,
        lunchNotified: false,
        rainSafetyNotified: false,
        checkoutReminderNotified: false
    },
    currentTime: new Date().toISOString(),
    view: 'dashboard', // dashboard, guide, manual, support, checkout, admin
    guideCategory: 'all',
    weather: { temp: '--', icon: '⏳' } // Initial weather state
};

// --- Configuration ---
const APP_VERSION = 'v14'; // Increment this to force cache clear
const API_URL = 'https://script.google.com/macros/s/AKfycbxpTn-SWgq2R6ZPwBVM4_2f4fUnPPulLX8CamxStJGSEhG9qbYznRHun33e1u9g3CyoEg/exec';

// Check app version and clear old cache if needed
const savedVersion = localStorage.getItem('casa25_version');
if (savedVersion !== APP_VERSION) {
    console.log(`App updated to ${APP_VERSION}, clearing old cache`);
    localStorage.clear();
    localStorage.setItem('casa25_version', APP_VERSION);
}

// Initialize from LocalStorage (Fallback/Cache)
const savedRes = localStorage.getItem('casa25_reservation');
if (savedRes) {
    const parsed = JSON.parse(savedRes);
    state.reservation = parsed;
}

// Fetch latest data from Cloud (Async)
fetchState();

// --- Time Detection ---
function getRentalStatus() {
    const now = new Date();
    const cin = new Date(state.reservation.checkIn);
    const cout = new Date(state.reservation.checkOut);

    // Threshold for dashboard feature activation: 48 hours before check-in
    const accessTime = new Date(cin.getTime() - (48 * 60 * 60 * 1000));

    if (now < accessTime) return 'pre-arrival';
    if (now >= accessTime && now <= cout) return 'stay';
    return 'post-departure';
}

// --- Weather Service ---
function fetchWeather() {
    // Open-Meteo API for Melgar, Tolima (Lat: 4.2048, Long: -74.6408)
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=4.2048&longitude=-74.6408&current=temperature_2m,is_day&timezone=America%2FBogota';

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.current) {
                const temp = Math.round(data.current.temperature_2m);
                const isDay = data.current.is_day;

                state.weather.temp = `${temp}°C`;
                state.weather.icon = isDay ? '☀️' : '🌙';

                // Update UI if valid
                const weatherEl = document.getElementById('weather-display');
                if (weatherEl) {
                    weatherEl.innerHTML = `📍 Melgar: ${state.weather.temp} ${state.weather.icon}`;
                }
            }
        })
        .catch(err => console.error('Weather fetch failed:', err));
}

function getWeatherWidget() {
    return `<span id="weather-display">📍 Melgar: ${state.weather.temp} ${state.weather.icon}</span>`;
}

// --- Icons ---
const icons = {
    wifi: '📶',
    door: '🔐',
    map: '📍',
    house: '🏠',
    rules: '📋',
    food: '🍽️',
    emergency: '🆘',
    checkout: '🚪',
    admin: '⚙️',
    ac: '❄️',
    pool: '🏊',
    kitchen: '🍳',
    domotics: '📱',
    water: '💧',
    trash: '🗑️',
    tv: '📺',
    support: '💬',
    taxi: '🚕',
    hiking: '🥾',
    people: '👥',
    pets: '🐾',
    calendar: '📅'
};

// --- View Templates ---

function renderLogin() {
    return `
        <div class="login-container">
            <div class="login-card">
                <div class="icon-box" style="margin: 0 auto 20px; background: var(--primary); color: white;">🔐</div>
                <h1>Casa 25 - Portal de la Estancia</h1>
                <p>Ingresa tu PIN de acceso</p>
                
                <div class="pin-display">
                    <input type="password" id="login-pin" readonly placeholder="••••">
                </div>

                <div class="keypad">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `<button onclick="appendPin('${n}')">${n}</button>`).join('')}
                    <button class="btn-clear" onclick="clearPin()">C</button>
                    <button class="btn-login" onclick="validateLogin()">Entrar</button>
                </div>
                
                <p id="login-error" style="color:var(--alert); font-size:14px; margin-top:15px; display:none;">PIN incorrecto o acceso fuera de horario.</p>
            </div>
        </div>
    `;
}

function renderDashboard() {
    const status = getRentalStatus();
    const isLocked = status === 'pre-arrival';
    const checkInDate = new Date(state.reservation.checkIn);
    const checkOutDate = new Date(state.reservation.checkOut);

    // Format Dates (e.g., "23 ene")
    const dateOpts = { day: 'numeric', month: 'short' };
    const cinDateStr = checkInDate.toLocaleDateString('es-ES', dateOpts);
    const coutDateStr = checkOutDate.toLocaleDateString('es-ES', dateOpts);

    // Format Times (e.g., "3:00 p.m.")
    const timeOpts = { hour: 'numeric', minute: '2-digit', hour12: true };
    const cinTimeStr = checkInDate.toLocaleTimeString('es-ES', timeOpts).toUpperCase();
    const coutTimeStr = checkOutDate.toLocaleTimeString('es-ES', timeOpts).toUpperCase();

    return `
        <header>
            <div class="weather-widget">
                ${getWeatherWidget()}
            </div>
            <p class="greeting">¡Hola ${state.reservation.huespedNombre}!</p>
            <h1 class="name">Estas en el Condominio Residencial Portal de la Estancia</h1>
            <h2 style="color:var(--accent); font-weight: 400; margin-top: -5px;">Ya todo está listo en la Casa 25 para que vivas unos días increíbles en el mejor clima de Colombia. ☀️</h2>
            
            <div class="card" style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.7);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 14px; color: var(--text);">
                        <span>${icons.calendar} <strong>${cinDateStr}</strong> (${cinTimeStr}) - <strong>${coutDateStr}</strong> (${coutTimeStr})</span>
                    </div>
                </div>
            </div>

            <div class="stay-progress" style="margin-top: 15px;">
                <div class="dot active"></div>
                <div class="dot ${status === 'stay' ? 'active' : ''}"></div>
                <div class="dot"></div>
            </div>
        </header>

        <section id="smart-lock" class="card" style="border-top: 5px solid ${isLocked ? '#ccc' : 'var(--primary)'}">
            <div class="icon-box">${icons.door}</div>
            <h2>Código de Entrada</h2>
            ${isLocked ? `
                <div class="warning-banner">
                    🔒 Código de puerta bloqueado. Disponible 48 horas antes de tu llegada.
                </div>
                <button class="btn btn-primary" onclick="openLink('https://docs.google.com/forms/d/e/1FAIpQLSf8_Ct31aTtiKfSUnoFU4ztUKLWGO1lr-f50wbs-EEIuHN5dQ/viewform?usp=preview')" style="font-size: 14px; line-height: 1.2; padding: 12px 20px;">
                    Formulario de registro obligatorio para ser diligenciado uno por cada huesped
                </button>
            ` : `
                <div class="door-code-box">
                    <p>Tu clave de acceso:</p>
                    <div class="door-code-value">${state.reservation.codigoPuerta}</div>
                    <small>Presiona el código seguido de # en el teclado.</small>
                </div>
            `}
        </section>

        <div class="tile-grid">
            <div class="tile ${isLocked ? 'tile-locked' : ''}" onclick="${isLocked ? '' : "navigate('manual')"}">
                <div class="icon">${icons.house}</div>
                <span>Conoce tu hogar</span>
                ${isLocked ? '<div class="lock-overlay">🔒</div>' : ''}
            </div>
            <div class="tile ${isLocked ? 'tile-locked' : ''}" onclick="${isLocked ? '' : "navigate('guide')"}">
                <div class="icon">${icons.food}</div>
                <span>Guía Local</span>
                ${isLocked ? '<div class="lock-overlay">🔒</div>' : ''}
            </div>
            <div class="tile ${isLocked ? 'tile-locked' : ''}" onclick="${isLocked ? '' : "navigate('support')"}">
                <div class="icon">${icons.support}</div>
                <span>Soporte</span>
                ${isLocked ? '<div class="lock-overlay">🔒</div>' : ''}
            </div>
            <div class="tile ${isLocked ? 'tile-locked' : ''}" onclick="${isLocked ? '' : "navigate('checkout')"}">
                <div class="icon">${icons.checkout}</div>
                <span>Check-out</span>
                ${isLocked ? '<div class="lock-overlay">🔒</div>' : ''}
            </div>
        </div>
        
        <div class="mode-switch-container">
            <button class="btn-mode-switch" onclick="logout()">
                🚪 Cerrar Sesión
            </button>
            ${state.role === 'admin' ? `
                <button class="btn-mode-switch" onclick="navigate('admin')" style="margin-left: 10px; background: #eee; color: #333;">
                    ⚙️ Configuración
                </button>
            ` : ''}
        </div>
    `;
}

function renderGuide() {
    const categories = [
        { id: 'all', name: 'Todos' },
        { id: 'fun', name: 'Diversión', icon: '🎢' },
        { id: 'food', name: 'Gastronomía', icon: icons.food },
        { id: 'shop', name: 'Compras', icon: '🛒' },
        { id: 'faith', name: 'Fe', icon: '⛪' },
        { id: 'emergency', name: 'Emergencias', icon: icons.emergency }
    ];

    return `
        <header>
            <button class="btn-small" onclick="navigate('dashboard')">← Volver</button>
            <h1>Favoritos Locales</h1>
            <p>Lo mejor de Melgar curado por tu anfitrión.</p>
        </header>

        <div class="category-pills">
            ${categories.map(c => `
                <div class="pill ${state.guideCategory === c.id ? 'active' : ''}" onclick="setGuideCategory('${c.id}')">
                    ${c.icon ? c.icon + ' ' : ''}${c.name}
                </div>
            `).join('')}
        </div>

        <div id="guide-list">
            ${state.guideCategory === 'fun' || state.guideCategory === 'all' ? `
                <div class="card">
                    <div class="icon-box">🎢</div>
                    <h2>Diversión y Turismo</h2>
                    
                    <div>
                        <h3 style="color:var(--primary)">Piscilago 🌊</h3>
                        <p>El parque acuático y conservatorio más grande de Colombia.</p>
                        <a href="https://maps.app.goo.gl/QTPbyvUCJBNqd8947" target="_blank" class="btn btn-accent">Ver en Maps</a>
                    </div>
                </div>
            ` : ''}

            ${state.guideCategory === 'food' || state.guideCategory === 'all' ? `
                <div class="card">
                    <div class="icon-box">${icons.food}</div>
                    <h2>Gastronomía</h2>
                    
                    <div style="margin-bottom:20px;">
                        <h3 style="color:var(--primary)">A comer donde Matías 🥩</h3>
                        <p>Comida típica de alta calidad. ¡Pide el desayuno tolimense!</p>
                        <div class="action-grid">
                            <a href="tel:+573208604216" class="btn btn-primary">Llamar</a>
                            <a href="https://maps.app.goo.gl/b17tZQXUgsJBeZEc6" target="_blank" class="btn btn-accent">Mapa</a>
                        </div>
                    </div>

                    <div>
                        <h3>La parrillada santandereana 🍖</h3>
                        <p>Excelente opción de asados y comida típica.</p>
                        <a href="https://maps.app.goo.gl/DSqLazaPBqmEXZKu9" target="_blank" class="btn btn-accent">Ver Mapa</a>
                    </div>
                </div>
            ` : ''}

            ${state.guideCategory === 'shop' || state.guideCategory === 'all' ? `
                <div class="card">
                    <div class="icon-box">🛒</div>
                    <h2>Compras</h2>
                    <div style="margin-bottom:15px;">
                        <h3>Éxito Melgar</h3>
                        <p>Supermercado completo con cajeros automáticos.</p>
                        <a href="https://maps.app.goo.gl/gbtgYtCE3EAe2cCZ8" target="_blank" class="btn btn-accent">Mapa</a>
                    </div>
                    <div>
                        <h3>D1 / Ara</h3>
                        <p>Opciones económicas para el mercado del día.</p>
                        <div class="action-grid" style="margin-top:10px;">
                            <a href="https://maps.app.goo.gl/tcZvcyUYtWzTGUJ28" target="_blank" class="btn btn-primary">Mapa D1</a>
                            <a href="https://maps.app.goo.gl/68HmqofC9h5VooRG8" target="_blank" class="btn btn-accent">Mapa Ara</a>
                        </div>
                    </div>
                </div>
            ` : ''}

            ${state.guideCategory === 'faith' || state.guideCategory === 'all' ? `
                <div class="card">
                    <div class="icon-box">⛪</div>
                    <h2>Espacios de Fe</h2>
                    <div style="margin-bottom:20px;">
                        <h3>Iglesia San Francisco de Asís</h3>
                        <p>Ubicada en la plaza principal de Melgar.</p>
                        <a href="https://maps.app.goo.gl/jL5wsWxUqKGdn2mX7" target="_blank" class="btn btn-accent">Ver Mapa</a>
                    </div>
                    <div>
                        <h3>Santuario de la Virgen ⛪</h3>
                        <p>Vistas panorámicas increíbles del Carmen de Apicalá.</p>
                        <a href="https://maps.app.goo.gl/ERwbtuni9NBJ9TsS9" target="_blank" class="btn btn-primary">Cómo llegar</a>
                    </div>
                </div>
            ` : ''}

            ${state.guideCategory === 'emergency' || state.guideCategory === 'all' ? `
                <div class="card" style="border-left:4px solid red;">
                    <div class="icon-box">${icons.emergency}</div>
                    <h2>Urgencias y Salud</h2>
                    <div style="margin-bottom:12px;">
                        <h3>Hospital Luis Pasteur</h3>
                        <p>Centro de salud principal de la región.</p>
                        <a href="https://maps.app.goo.gl/sJfVCH6Y5UfxkBGe8" target="_blank" class="btn btn-accent">Cómo llegar</a>
                    </div>
                    <button class="btn btn-alert" onclick="window.open('tel:123')">Llamar 123</button>
                </div>
            ` : ''}
        </div>
    `;
}

function renderManual() {
    return `
        <header>
            <button class="btn-small" onclick="navigate('dashboard')">← Volver</button>
            <h1>Conoce tu hogar</h1>
            <p>Todo lo que necesitas para una estancia perfecta.</p>
        </header>

        <div class="survival-guide">
            <!-- 0. Location (New Position) -->
            <div class="accordion" id="acc-location">
                <div class="accordion-header" onclick="toggleAccordion('acc-location')">
                    <div class="accordion-title">
                        <span>📍</span>
                        <h3>Ubicación y Cómo Llegar</h3>
                    </div>
                    <div class="accordion-icon">⌄</div>
                </div>
                <div class="accordion-content">
                    <h4>Navegación GPS</h4>
                    <p>Selecciona tu aplicación preferida para llegar directamente al <strong>Condominio Portal de la Estancia</strong>.</p>
                    <div class="action-grid" style="margin-top:15px;">
                        <button class="btn btn-primary" onclick="openLink('https://www.google.com/maps/dir/?api=1&destination=Condominio+Portal+de+la+Estancia+Melgar')">Google Maps</button>
                        <button class="btn btn-accent" onclick="openLink('https://waze.com/ul?q=Condominio+Portal+de+la+Estancia+Melgar&navigate=yes')">Waze</button>
                    </div>
                </div>
            </div>

            <!-- 1. Access & Security -->
            <div class="accordion" id="acc-security">
                <div class="accordion-header" onclick="toggleAccordion('acc-security')">
                    <div class="accordion-title">
                        <span>🔐</span>
                        <h3>Acceso y Seguridad</h3>
                    </div>
                    <div class="accordion-icon">⌄</div>
                </div>
                <div class="accordion-content">
                    <h4>Llegada y Registro</h4>
                    <p>¡Bienvenido! Al llegar al lugar, te registras en la portería donde les colocarán una manilla a cada invitado, solo debes mantenerla puesta para disfrutar de las zonas sociales (ya están totalmente pagas para tu tranquilidad).</p>
                    
                    <h4>Parqueadero</h4>
                    <p>Tenemos disponibles 2 parqueaderos privados marcados con los números <strong>53</strong> y <strong>54</strong> donde puedes ubicar tus vehículos cómodamente.</p>
                    
                    <h4>Tu Hogar: Casa 25</h4>
                    <p>Una vez estés adentro del condominio, ubica la <strong>Casa 25</strong>. ¡Ya casi estás listo para disfrutar!</p>
                    
                    <h4>Cerradura Inteligente 🔐</h4>
                    <p>La clave de acceso para la puerta es: <strong>${state.reservation.codigoPuerta}</strong></p>
                    <div class="tip-box">
                        ⚠️ Precaución: En caso de que te equivoques más de tres veces al ingresar la clave, por seguridad, la cerradura se bloqueará. Te recomendamos esperar 5 minutos e intentar de nuevo, ya que si sigues intentando de inmediato, el tiempo de bloqueo aumentará.
                    </div>
                    
                    <p style="margin-top: 15px; font-weight: bold;">Acá un video:</p>
                    <video controls style="width: 100%; max-width: 400px; border-radius: 10px; margin-top: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <source src="Apertura puerta.mp4" type="video/mp4">
                        Tu navegador no soporta el elemento de video.
                    </video>
                    
                    <h4>Cámaras y Seguridad</h4>
                    <p>La propiedad cuenta con cámaras en la portería y áreas externas del condominio para tu tranquilidad. Hay una camara privada en la entrada de la casa, pero para garantizar tu privavidad, al interior no hay.</p>
                </div>
            </div>

            <!-- 2. Connectivity -->
            <div class="accordion" id="acc-wifi">
                <div class="accordion-header" onclick="toggleAccordion('acc-wifi')">
                    <div class="accordion-title">
                        <span>📡</span>
                        <h3>WiFi y Entretenimiento</h3>
                    </div>
                    <div class="accordion-icon">⌄</div>
                </div>
                <div class="accordion-content">
                    <h4>Conectarte al WiFi</h4>
                    <p>Red: <strong>PORTAL_ESTANCIA_CASA25</strong></p>
                    <div class="qr-box">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=WIFI:S:PORTAL_ESTANCIA_CASA25;T:WPA;P:CRPECa25;;" alt="QR WiFi" style="width:150px; height:150px; margin-bottom:10px;">
                        <p>Escanea con tu cámara para conectarte o toca abajo para copiar la clave</p>
                        <button class="btn btn-primary" onclick="connectWifi()">Copiar Clave</button>
                    </div>
                    <h4>Smart TV</h4>
                    <p>Disponemos de Smart TV para que puedas usar tus cuentas de streaming (Netflix, Disney+, entre otras).</p>
                    <div class="tip-box">
                        📺 Conecta el TV al parlante vía Bluetooth para una experiencia de cine.
                    </div>
                </div>
            </div>

            <!-- 3. Climatization -->
            <div class="accordion" id="acc-climate">
                <div class="accordion-header" onclick="toggleAccordion('acc-climate')">
                    <div class="accordion-title">
                        <span>❄️</span>
                        <h3>Climatización y Agua</h3>
                    </div>
                    <div class="accordion-icon">⌄</div>
                </div>
                <div class="accordion-content">
                    <h4>Aire Acondicionado</h4>
                    <p>Temperatura recomendada: <strong>18°C</strong>.</p>
                    <ul>
                        <li>Por favor mantén ventanas cerradas mientras el aire esté encendido.</li>
                        <li>De noche sugerimos apagar el aire acondicionado y usar los ventiladores de techo para un mejor descanso.</li>
                        <li>Cada control remoto está marcado para evitar confusiones.</li>
                    </ul>

                    <h4>Pérgolas y black-outs</h4>
                    <p>Nos encanta la tecnología y la facilidad de uso, por eso estos elementos son eléctricos. Por lo que recomendamos las pérgolas recógelas cada noche o si llueve; ya que el peso puede dañarlas. ¡Gracias por cuidarlas! ⛈️. Los black-outs se recomienda recogerlos por completo durante el día, para que el sol no los queme.</p>
                    
                    <h4>Agua (PISCINA)</h4>
                    <p>En Melgar el agua sale a temperatura ambiente. <strong>Importante:</strong> Es obligatorio el uso de gorro de baño. Los menores deben estar siempre acompañados. Por higiene, no está permitido ingerir alimentos dentro de la zona húmeda.</p>
                </div>
            </div>

            <!-- 4. Kitchen & Appliances -->
            <div class="accordion" id="acc-kitchen">
                <div class="accordion-header" onclick="toggleAccordion('acc-kitchen')">
                    <div class="accordion-title">
                        <span>☕</span>
                        <h3>Cocina y Equipos</h3>
                    </div>
                    <div class="accordion-icon">⌄</div>
                </div>
                <div class="accordion-content">
                    <h4>Cafetera (Café Molido)</h4>
                    <p>1. Llenar el tanque de agua. 2. Colocar filtro y café molido. 3. Presionar botón de encendido lateral.</p>
                    
                    <h4>Estufa de Vidrio (Gas)</h4>
                    <p>Gira la perilla y presiona el botón de la chispa (el rayo) para iniciar el fuego.</p>
                    
                    <h4>Air-fryer y Licuadora</h4>
                    <p>Enchufa el equipo, ajusta el tiempo/velocidad y asegúrate de cerrar bien la tapa antes de iniciar.</p>
                    
                    <h4>Horno Eléctrico y Microondas</h4>
                    <p>El horno requiere precalentamiento (10 min). En el microondas, usa solo recipientes aptos.</p>
                    
                    <h4>Exprimidor de Naranjas</h4>
                    <p>Corta la naranja y presiona suavemente sobre el cono; el motor iniciará automáticamente.</p>
                    
                    <h4>BBQ (Pipeta de Gas)</h4>
                    <p>1. Abre la válvula de la pipeta de gas. 2. Gira la perilla del asador y enciende. <strong>⚠️ Importante:</strong> Cierra la válvula de la pipeta al terminar.</p>

                    <h4>Agua Potable</h4>
                    <p>💧 La nevera cuenta con filtro interno. El agua y hielo de la nevera son aptos para consumo humano.</p>
                </div>
            </div>

            <!-- 5. Waste -->
            <div class="accordion" id="acc-waste">
                <div class="accordion-header" onclick="toggleAccordion('acc-waste')">
                    <div class="accordion-title">
                        <span>🗑️</span>
                        <h3>Gestión de Residuos</h3>
                    </div>
                    <div class="accordion-icon">⌄</div>
                </div>
                <div class="accordion-content">
                    <h4>Reciclaje</h4>
                    <ul>
                        <li><strong>Bolsa Blanca:</strong> Plástico, cartón, vidrio limpio.</li>
                        <li><strong>Bolsa Negra/Verde   :</strong> Residuos orgánicos y no reciclables.</li>
                    </ul>
                    <h4>Puntos de Entrega</h4>
                    <p>El cuarto de basuras (Shut) está ubicado a 50 metros de la portería del condominio. Recuerda sacar la basura antes de tu partida.</p>
                </div>
            </div>

            <!-- 6. Rules -->
            <div class="accordion" id="acc-rules">
                <div class="accordion-header" onclick="toggleAccordion('acc-rules')">
                    <div class="accordion-title">
                        <span>📋</span>
                        <h3>Normas de la Casa</h3>
                    </div>
                    <div class="accordion-icon">⌄</div>
                </div>
                <div class="accordion-content">
                    <h4>Convivencia</h4>
                    <ul>
                        <li><strong>Horas de silencio:</strong> 10 PM a 8 AM.</li>
                        <li><strong>Prohibido fumar:</strong> En todo el interior de la casa. Permitido solo en áreas abiertas (BBQ/Piscina).</li>
                        <li><strong>Jacuzzi:</strong> Tiene capacidad para hasta 16 invitados. De igual manera está prohibido el consumo de bebidas o alimentos dentro del jacuzzi 🚫🍔🍺🚫, para evitar daños en los sistemas de chorros.</li>
                        <li><strong>Mascotas:</strong> ¡Los peluditos son bienvenidos! 🐶😺 Pero no tienen acceso al jacuzzi, para evitar que sus pelitos generen daños en los sistemas de chorros.</li>
                        <li><strong>Zonas Comunes:</strong> Disfruta de la piscina y la cancha múltiple. Ten en cuenta que el gimnasio y el sauna no están habilitados para esta estancia.</li>
                    </ul>
                </div>
            </div>

            <!-- 7. Emergencies -->
            <div class="accordion" id="acc-emergency">
                <div class="accordion-header" onclick="toggleAccordion('acc-emergency')">
                    <div class="accordion-title">
                        <span>🆘</span>
                        <h3>Emergencias</h3>
                    </div>
                    <div class="accordion-icon">⌄</div>
                </div>
                <div class="accordion-content">
                    <h4>Ubicación de Equipos</h4>
                    <ul>
                        <li><strong>Extintor:</strong> Está junto a la puerta principal.</li>
                        <li><strong>Botiquín:</strong> El botiquín está en el estudio (piso 2). 🩺</li>
                    </ul>
                    <h4>Línea de Emergencia</h4>
                    <a href="tel:123" class="btn btn-alert" style="margin-bottom: 20px; text-decoration: none; color: white;">📞 Llamar al 123</a>

                    <div class="tip-box" style="margin-bottom: 20px;">
                        🏥 <strong>Tip Médico:</strong> El hospital de Melgar está a 15 minutos en la vía principal. Puedes ver la ubicación exacta aquí: <a href="https://maps.app.goo.gl/sJfVCH6Y5UfxkBGe8" target="_blank" style="color: inherit; font-weight: 600;">Abrir en Maps</a>.
                    </div>
                    
                </div>
            </div>
        </div>
    `;
}

function renderSupport() {
    return `
        <header>
            <button class="btn-small" onclick="navigate('dashboard')">← Volver</button>
            <h1>Soporte & Ayuda</h1>
            <p>Estamos aquí para asegurarnos de que todo sea perfecto.</p>
        </header>

        <div class="card" style="border-top:5px solid var(--primary);">
            <div class="icon-box">${icons.support}</div>
            <h2>Contactar Anfitrión</h2>
            <p style="margin-bottom: 15px;"><strong>¿Algo falló en la casa?</strong> Avísanos de inmediato, estamos para ayudarte.</p>
            <div class="action-grid" style="grid-template-columns: 1fr 1fr; gap: 10px;">
                <a href="tel:+573045481250" class="btn btn-primary" style="font-size: 14px; margin-bottom: 0;">📞 Paola</a>
                <a href="tel:+573008950277" class="btn btn-primary" style="font-size: 14px; margin-bottom: 0;">📞 Hugo</a>
                <a href="tel:+573012597061" class="btn btn-primary" style="font-size: 14px; margin-bottom: 0;">📞 Mónica</a>
                <a href="tel:+573012596991" class="btn btn-primary" style="font-size: 14px; margin-bottom: 0;">📞 Anderson</a>
            </div>
        </div>

        <div class="card">
            <h2>Reportar un Problema</h2>
            <p>¿Algo no funciona como debería? Avísanos para resolverlo pronto.</p>
            <div class="support-section" style="margin-top:16px;">
                <textarea id="issue-text" placeholder="Describe brevemente lo ocurrido..."></textarea>
                <button class="btn btn-primary" onclick="submitIssue()">Enviar Reporte</button>
            </div>
        </div>
    `;
}

function renderCheckOut() {
    const checklistItems = [
        { id: 'lights', text: 'Apagar luces y Aire/Ventiladores' },
        { id: 'windows', text: 'Cerrar todas las ventanas' },
        { id: 'pergolas', text: 'Recoger todas las Pérgolas' },
        { id: 'umbrella', text: 'Enrollar la sombrilla del jacuzzi' },
        { id: 'belongings', text: 'Verificar que no quede ninguna de tus pertenencias' },
        { id: 'trash', text: 'Sacar la basura al Shut' }
    ];

    return `
        <header>
            <button class="btn-small" onclick="navigate('dashboard')">← Volver</button>
            <h1>Check-out Inteligente ✨</h1>
            <p>Gracias por cuidarnos como tu propio hogar.</p>
        </header>

        <div class="card">
            <h2>Lista de Verificación</h2>
            <div id="checkout-list">
                ${checklistItems.map(item => `
                    <div class="check-item-modern" onclick="toggleCheckItem('${item.id}')">
                        <div class="checkbox-ui ${state.reservation[item.id] ? 'checked' : ''}">
                            ${state.reservation[item.id] ? '✓' : ''}
                        </div>
                        <span style="${state.reservation[item.id] ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${item.text}</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="card">
            <h2>No queremos que te vayas sin antes que nos digas algo</h2>
            <p>¿Hay algo especial que te gustaría encontrar en tu próxima visita?</p>
            <textarea id="feedback-input" placeholder="Tu deseo..." style="margin-top:10px; height:80px;">${state.reservation.feedback || ''}</textarea>
        </div>

        <div class="card" style="background: linear-gradient(135deg, #fff 0%, #f0f7ff 100%); border-left: 5px solid #FF5A5F;">
            <h3 style="color: #FF5A5F; margin-top: 0;">¡Tu opinión nos importa!</h3>
            <p>Agradecemos de antemano tu ayuda dejándonos una <strong>reseña en Airbnb</strong>. Tus comentarios son fundamentales para mantener la calidad de nuestro servicio. ¡Buen viaje! 😁</p>
        </div>

        <button id="final-checkout-btn" class="btn btn-primary" onclick="finalizeCheckout()" style="margin-top:20px; transition: var(--transition);">
            Finalizar Estancia
        </button>
    `;
}

function renderThanks() {
    return `
        <div class="screen active thanks-screen" style="text-align:center; padding-top:60px;">
            <div class="icon-box" style="margin: 0 auto 30px; width:80px; height:80px; font-size:40px; background:var(--primary); color:white;">✨</div>
            <h1>¡Buen viaje!</h1>
            <p>Gracias por elegir Casa 25. Esperamos verte pronto de regreso en el paraíso.</p>
            <div class="card" style="margin-top:40px;">
                <p>Tu feedback ha sido enviado al anfitrión.</p>
            </div>
            <button class="btn btn-primary" onclick="navigate('dashboard')" style="margin-top:40px;">Volver al Inicio</button>
        </div>
    `;
}

function renderAdmin() {
    return `
        <header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <button class="btn-small" onclick="logout()">← Salir</button>
                <button class="btn-small" onclick="navigate('dashboard')">👀 Ver como Huésped</button>
            </div>
            <h1>Configuración Admin</h1>
        </header>

        <div style="padding: 0 20px;">
            <div class="weather-widget">
                ${getWeatherWidget()}
            </div>
        </div>

        <div class="card">
            <h2>Datos de la Reserva</h2>
            <div class="form-group">
                <label>Nombre Huésped</label>
                <input type="text" id="adm-name" value="${state.reservation.huespedNombre}">
            </div>
            <div class="action-grid">
                <div class="form-group">
                    <label>Huéspedes Max</label>
                    <input type="number" id="adm-max" value="${state.reservation.huespedesMax}">
                </div>
                <div class="form-group">
                    <label>Mascotas Perm.</label>
                    <select id="adm-pets" style="width:100%; padding:14px; border-radius:12px; border:1px solid #ddd; font-family:inherit; font-size:16px;">
                        <option value="No" ${state.reservation.mascotasPermitidas === 'No' ? 'selected' : ''}>No</option>
                        <option value="Si (1, bajo reglas)" ${state.reservation.mascotasPermitidas === 'Si (1, bajo reglas)' ? 'selected' : ''}>Si (1, bajo reglas)</option>
                        <option value="Si (2, bajo reglas)" ${state.reservation.mascotasPermitidas === 'Si (2, bajo reglas)' ? 'selected' : ''}>Si (2, bajo reglas)</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Código Puerta</label>
                <input type="text" id="adm-code" value="${state.reservation.codigoPuerta}">
            </div>
            <div class="form-group">
                <label>Fecha Check-in</label>
                <input type="datetime-local" id="adm-in" value="${state.reservation.checkIn.substring(0, 16)}">
            </div>
            <div class="form-group">
                <label>Fecha Check-out</label>
                <input type="datetime-local" id="adm-out" value="${state.reservation.checkOut.substring(0, 16)}">
            </div>
            <div class="form-group">
                <label>PIN de Acceso Huésped</label>
                <input type="text" id="adm-guest-pin" value="${state.reservation.guestPin}">
            </div>
            <button class="btn btn-primary" onclick="saveAdmin()">Guardar Cambios</button>
        </div>

        <div class="card">
            <h2>Seguimiento de Estancia</h2>
            <div id="adm-tracking">
                <h3>Feedback del Huésped</h3>
                <div class="feedback-box">
                    ${state.reservation.feedback || '<p style="font-style:italic">Aún no hay feedback.</p>'}
                </div>

                <h3 style="margin-top:20px;">Problemas Reportados (${state.reservation.issues.length})</h3>
                <div class="issues-list">
                    ${state.reservation.issues.length ? state.reservation.issues.map(issue => `
                        <div class="issue-item" style="border-left: 3px solid var(--alert); padding-left:10px; margin-bottom:10px;">
                            <small>${new Date(issue.date).toLocaleString()}</small>
                            <p style="margin:5px 0">${issue.text}</p>
                            <span class="status-badge">${issue.status}</span>
                        </div>
                    `).join('') : '<p>No hay problemas reportados.</p>'}
                </div>
            </div>
        </div>
    `;
}

// --- Navigation & Actions ---

window.toggleAccordion = function (id) {
    const acc = document.getElementById(id);
    const isOpen = acc.classList.contains('open');

    // Close all others
    document.querySelectorAll('.accordion').forEach(a => a.classList.remove('open'));

    // Toggle current
    if (!isOpen) acc.classList.add('open');

    // Scroll active into view after it opens
    setTimeout(() => {
        if (!isOpen) acc.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
};

window.navigate = function (view) {
    state.view = view;
    render();
    window.scrollTo(0, 0);
};

window.connectWifi = function () {
    const wifiUrl = 'WIFI:S:PORTAL_ESTANCIA_CASA25;T:WPA;P:CRPECa25;;';
    showToast('Intentando conectar al WiFi...');
    // In a real device, this could be handled by a specific PWA handler or QR
    navigator.clipboard.writeText('CRPECa25').then(() => {
        showToast('Clave copiada: CRPECa25. Úsala en tu config wifi.');
    });
};

window.openLink = function (url) {
    window.open(url, '_blank');
};

window.toggleAdmin = function () {
    state.role = state.role === 'admin' ? 'guest' : 'admin';
    if (state.role === 'admin') navigate('admin');
    else navigate('dashboard');
};

window.saveAdmin = function () {
    // Detect if it's a new guest (Name changed)
    const newName = document.getElementById('adm-name').value;
    if (state.reservation.huespedNombre !== newName) {
        // Reset Guest Data for new stay
        state.reservation.feedback = '';
        state.reservation.issues = [];
        state.reservation.welcomeNotified = false;
        state.reservation.sunsetNotified = false;
        state.reservation.quietHoursNotified = false;
        state.reservation.lunchNotified = false;
        state.reservation.rainSafetyNotified = false;
        state.reservation.checkoutReminderNotified = false;

        // Reset Checklist
        ['lights', 'windows', 'pergolas', 'umbrella', 'belongings', 'trash'].forEach(id => state.reservation[id] = false);
    }

    state.reservation.huespedNombre = newName;
    state.reservation.huespedesMax = document.getElementById('adm-max').value;
    state.reservation.mascotasPermitidas = document.getElementById('adm-pets').value;
    state.reservation.codigoPuerta = document.getElementById('adm-code').value;
    state.reservation.guestPin = document.getElementById('adm-guest-pin').value;
    state.reservation.checkIn = document.getElementById('adm-in').value;
    state.reservation.checkOut = document.getElementById('adm-out').value;

    saveState(); // Syncs to Cloud & Local
    showToast('Reserva actualizada correctamente');
    navigate('dashboard');
};

window.submitIssue = function () {
    const text = document.getElementById('issue-text').value;
    if (!text) return showToast('Escribe algo primero');

    const issue = {
        date: new Date().toISOString(),
        text: text,
        status: 'Pendiente'
    };

    state.reservation.issues.push(issue);

    // Save locally
    localStorage.setItem('casa25_reservation', JSON.stringify(state.reservation));

    // Send to Google Cloud
    fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
            action: 'add_feedback',
            type: 'issue',
            message: text,
            guestName: state.reservation.huespedNombre
        })
    }).then(() => {
        showToast("Reporte enviado al anfitrión 📨");
        document.getElementById('issue-text').value = '';
    }).catch(() => {
        showToast("Guardado localmente (Sin internet)");
    });
};

window.appendPin = function (val) {
    const pin = document.getElementById('login-pin');
    if (pin.value.length < 10) pin.value += val;
};

window.clearPin = function () {
    document.getElementById('login-pin').value = '';
    document.getElementById('login-error').style.display = 'none';
};

window.validateLogin = function () {
    const pin = document.getElementById('login-pin').value;
    const errorEl = document.getElementById('login-error');

    // Check Admin PINs
    if (state.adminPins.includes(pin)) {
        state.isAuthenticated = true;
        state.role = 'admin';
        state.view = 'admin';
        render();
        return;
    }

    // Check Guest Access
    if (pin === state.reservation.guestPin) {
        // Validate Date Range
        const now = new Date();
        const checkOutDate = new Date(state.reservation.checkOut);

        // Allow access up to 2 hours after checkout for late departure coordination? 
        // User requested strict "not enabled". Let's say strictly after Checkout.
        if (now > checkOutDate) {
            errorEl.innerText = "Esta reserva ha finalizado. Acceso expirado.";
            errorEl.style.display = 'block';
            return;
        }

        state.isAuthenticated = true;
        state.role = 'guest';
        state.view = 'dashboard';
        render();
    } else {
        // PIN not found locally? Try Cloud!
        showToast('Buscando reserva en la nube... ☁️');
        fetch(`${API_URL}?pin=${pin}`)
            .then(res => res.json())
            .then(data => {
                // Validar que tengamos datos reales (no solo ausencia de error)
                if (data && data.huespedNombre && data.guestPin) {
                    // FOUND! Switch context to this reservation
                    state.reservation = { ...state.reservation, ...data };
                    localStorage.setItem('casa25_reservation', JSON.stringify(state.reservation));

                    // Validar fecha de checkout (igual que en validación local)
                    const now = new Date();
                    const checkOutDate = new Date(state.reservation.checkOut);

                    if (now > checkOutDate) {
                        errorEl.innerText = "Esta reserva ha finalizado. Acceso expirado.";
                        errorEl.style.display = 'block';
                        return;
                    }

                    showToast(`¡Bienvenido ${state.reservation.huespedNombre}! 🏠`);

                    state.isAuthenticated = true;
                    state.role = 'guest';
                    state.view = 'dashboard';
                    render();
                } else {
                    errorEl.innerText = "PIN incorrecto o no encontrado.";
                    errorEl.style.display = 'block';
                }
            })
            .catch(() => {
                errorEl.innerText = "PIN incorrecto. (Sin conexión)";
                errorEl.style.display = 'block';
            });
    }
};

window.logout = function () {
    state.isAuthenticated = false;
    state.role = 'guest';
    state.view = 'dashboard';
    render();
};

window.toggleCheckItem = function (id) {
    state.reservation[id] = !state.reservation[id];
    render();
    checkCheckoutSubmittable();
};

function checkCheckoutSubmittable() {
    const items = ['lights', 'windows', 'pergolas', 'umbrella', 'belongings', 'trash'];
    const allChecked = items.every(id => state.reservation[id]);
    const btn = document.getElementById('final-checkout-btn');
    if (btn) {
        btn.style.opacity = allChecked ? '1' : '0.5';
        btn.style.pointerEvents = allChecked ? 'auto' : 'none';
    }
}

window.finalizeCheckout = function () {
    const val = document.getElementById('feedback-input').value;
    if (val) {
        state.reservation.feedback = val;

        // Send feedback to Cloud
        fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'add_feedback',
                type: 'feedback',
                message: val,
                guestName: state.reservation.huespedNombre
            })
        }).catch(console.error);
    }

    // Mark locally and save
    state.reservation.checkOutTime = new Date().toISOString();
    saveState();

    const container = document.getElementById('app');
    container.innerHTML = renderThanks();
    window.scrollTo(0, 0);
};

window.submitFeedback = function () {
    const val = document.getElementById('feedback-input').value;
    state.reservation.feedback = val;
    localStorage.setItem('casa25_reservation', JSON.stringify(state.reservation));
    showToast('¡Gracias! Tomamos nota para tu próxima visita.');
    setTimeout(() => navigate('dashboard'), 2000);
};

window.setGuideCategory = function (cat) {
    state.guideCategory = cat;
    render();
};

window.submitIssue = function () {
    const text = document.getElementById('issue-text').value;
    if (!text) return showToast('Por favor describe el problema');

    state.reservation.issues.push({
        text: text,
        date: new Date().toISOString(),
        status: 'Pendiente'
    });

    // 1. Save to State Cloud (So Admin sees it in Dashboard)
    saveState();

    // 2. Send to Feedback Sheet (For logging)
    fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
            action: 'add_feedback',
            type: 'issue',
            message: text,
            guestName: state.reservation.huespedNombre
        })
    }).then(() => {
        showToast('Reporte enviado. Nos pondremos en contacto pronto.');
        document.getElementById('issue-text').value = '';
        setTimeout(() => navigate('dashboard'), 2000);
    }).catch(() => {
        showToast('Guardado localmente (Sin internet)');
    });
};

function showToast(msg) {
    const toast = document.getElementById('notification-toast');
    toast.innerText = msg;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3000);
}

// --- Main Render Engine ---
window.showLocationMenu = function () {
    const googleUrl = 'https://maps.google.com/?q=Condominio+Residencial+Portal+de+la+Estancia+Melgar';
    const wazeUrl = 'https://waze.com/ul?q=Condominio+Residencial+Portal+de+la+Estancia+Melgar';

    const html = `
        <div class="modal-overlay" id="location-modal" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <h2>¿Cómo deseas llegar?</h2>
                <button class="btn btn-primary" onclick="window.open('${googleUrl}', '_blank')">Abrir Google Maps</button>
                <button class="btn btn-accent" onclick="window.open('${wazeUrl}', '_blank'); closeModal()" style="background-color: #33ccff;">Abrir Waze</button>
                <button class="btn" onclick="closeModal()" style="margin-top: 10px; background: #eee; color: #666;">Cancelar</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    setTimeout(() => document.getElementById('location-modal').classList.add('active'), 10);
};

window.closeModal = function () {
    const modal = document.getElementById('location-modal');
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
};

function render() {
    const container = document.getElementById('app');

    if (!state.isAuthenticated) {
        container.innerHTML = renderLogin();
        return;
    }

    let content = '';
    switch (state.view) {
        case 'dashboard': content = renderDashboard(); break;
        case 'guide': content = renderGuide(); break;
        case 'manual': content = renderManual(); break;
        case 'support': content = renderSupport(); break;
        case 'checkout': content = renderCheckOut(); break;
        case 'admin': content = renderAdmin(); break;
    }

    container.innerHTML = `<div class="screen active">${content}</div>`;
}

// --- Triggers & Notifications ---

function checkTriggers() {
    if (!state.reservation.checkIn || !state.reservation.checkOut) return;

    const now = new Date();
    const cin = new Date(state.reservation.checkIn);
    const cout = new Date(state.reservation.checkOut);

    const diffMs = now - cin;
    const diffHours = diffMs / (1000 * 60 * 60);

    // 1. Welcome Trigger (Day 1 - 15 mins after check-in)
    if (diffHours >= 0.25 && diffHours < 1 && !state.reservation.welcomeNotified) {
        showToast("¡Hola! Esperamos que ya estés disfrutando de la Casa 25. 🌴 Recuerda que en el Dashboard tienes clave WiFi y puerta.");
        state.reservation.welcomeNotified = true;
        saveState();
    }

    // 2. Preventive Trigger (Day 1 - 6:30 PM)
    if (now.getDate() === cin.getDate() && now.getHours() === 18 && now.getMinutes() >= 30 && !state.reservation.sunsetNotified) {
        showToast("El sol se está ocultando. 🌅 Para cuidar los black-outs y pérgolas, te recomendamos recogerlos ahora. ¡Gracias!");
        state.reservation.sunsetNotified = true;
        saveState();
    }

    // 3. Quiet Hours Trigger (Day 1 - 9:45 PM)
    if (now.getDate() === cin.getDate() && now.getHours() === 21 && now.getMinutes() >= 45 && !state.reservation.quietHoursNotified) {
        showToast("¡Esperamos que estés pasando una gran noche! 🌙 Te recordamos que a las 10:00 PM inician las horas de silencio.");
        state.reservation.quietHoursNotified = true;
        saveState();
    }

    // 4. Foodie Trigger (Day 2 - 11:30 AM)
    const day2 = new Date(cin);
    day2.setDate(day2.getDate() + 1);
    if (now.getDate() === day2.getDate() && now.getHours() === 11 && now.getMinutes() >= 30 && !state.reservation.lunchNotified) {
        showToast("¿Hambre? 🍴 Te recomendamos 'A comer donde Matías' o 'La Parrillada Santandereana'. Mira la Guía Local.");
        state.reservation.lunchNotified = true;
        saveState();
    }

    // 5. Weather Safety Trigger (Simulated > 70% rain)
    // Only runs randomly between 8 AM and 8 PM
    if (now.getHours() >= 8 && now.getHours() <= 20 && Math.random() > 0.99 && !state.reservation.rainSafetyNotified) {
        showToast("⚠️ AVISO IMPORTANTE: Se detecta lluvia cercana. Por favor, recoge las pérgolas eléctricas para evitar daños.");
        state.reservation.rainSafetyNotified = true;
        saveState();
    }

    // 6. Check-out Reminder (4 hours before departure)
    const msBeforeCheckout = cout - now;
    const hoursBeforeCheckout = msBeforeCheckout / (1000 * 60 * 60);

    if (hoursBeforeCheckout <= 4 && hoursBeforeCheckout > 3 && !state.reservation.checkoutReminderNotified) {
        const checkoutTimeStr = cout.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
        showToast(`¡Buenos días! ☀️ Te recordamos que el check-out es a las ${checkoutTimeStr}. Revisa el checklist de salida.`);
        state.reservation.checkoutReminderNotified = true;
        saveState();
    }
}

function saveState() {
    // 1. Save locally immediately (Optimistic UI)
    localStorage.setItem('casa25_reservation', JSON.stringify(state.reservation));

    // 2. Sync with Google Cloud (Background)
    fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: JSON.stringify({
            action: 'save_reservation',
            payload: state.reservation
        })
    })
        .then(() => {
            console.log('✅ Enviado a Google Sheets');
            showToast('Sincronizado con la nube ☁️');
        })
        .catch(err => {
            console.warn('Sync error (Offline?):', err);
            showToast('Guardado solo localmente (Sin internet)');
        });
}

function fetchState() {
    showToast('Sincronizando... ☁️');
    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
            if (data && !data.empty) {
                // Update local state with cloud data
                state.reservation = { ...state.reservation, ...data };
                localStorage.setItem('casa25_reservation', JSON.stringify(state.reservation));
                showToast('Datos actualizados de la nube ✅');

                // Refresh UI if needed (e.g. if we are already logged in)
                if (state.isAuthenticated && state.view === 'dashboard') {
                    document.getElementById('app').innerHTML = renderDashboard();
                } else if (state.isAuthenticated && state.view === 'admin') {
                    document.getElementById('app').innerHTML = renderAdmin();
                }
            }
        })
        .catch(err => {
            console.log('Fetch error:', err);
            showToast('Error de conexión ⚠️ Usando local');
        });
}

// Start the app
document.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker (Only on HTTPS or Localhost)
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration skipped (Local file)'));
    }

    // Run triggers every minute
    setInterval(checkTriggers, 60000);
    checkTriggers();

    // Fetch Weather
    fetchWeather();

    // Ensure render happens after a small delay to show the loader
    setTimeout(() => {
        try {
            render();
        } catch (e) {
            console.error("Render failed:", e);
            document.getElementById('loading-screen').innerHTML = `<p>Error al cargar: ${e.message}</p>`;
        }
    }, 1000);
});
