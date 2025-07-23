"use client"

export default function VHTLogos() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-12">Veridian Hex Technologies - Logos Únicos</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Logo 1: Neural Hex */}
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold text-white mb-4">Neural Hex</h3>
            <svg width="200" height="200" viewBox="0 0 200 200" className="mx-auto">
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
                <filter id="glow1">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Hexágono principal */}
              <polygon
                points="100,20 160,55 160,125 100,160 40,125 40,55"
                fill="none"
                stroke="url(#grad1)"
                strokeWidth="3"
                filter="url(#glow1)"
              />

              {/* Hexágonos internos */}
              <polygon
                points="100,40 140,62.5 140,107.5 100,130 60,107.5 60,62.5"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                opacity="0.7"
              />

              {/* Circuitos neurales */}
              <circle cx="100" cy="85" r="8" fill="#06B6D4" opacity="0.8" />
              <circle cx="80" cy="70" r="4" fill="#10B981" opacity="0.6" />
              <circle cx="120" cy="70" r="4" fill="#10B981" opacity="0.6" />
              <circle cx="70" cy="100" r="4" fill="#06B6D4" opacity="0.6" />
              <circle cx="130" cy="100" r="4" fill="#06B6D4" opacity="0.6" />

              {/* Conexiones */}
              <line x1="100" y1="85" x2="80" y2="70" stroke="#10B981" strokeWidth="1" opacity="0.5" />
              <line x1="100" y1="85" x2="120" y2="70" stroke="#10B981" strokeWidth="1" opacity="0.5" />
              <line x1="100" y1="85" x2="70" y2="100" stroke="#06B6D4" strokeWidth="1" opacity="0.5" />
              <line x1="100" y1="85" x2="130" y2="100" stroke="#06B6D4" strokeWidth="1" opacity="0.5" />

              {/* Texto VHT */}
              <text x="100" y="180" textAnchor="middle" fill="url(#grad1)" fontSize="14" fontWeight="bold">
                VHT
              </text>
            </svg>
          </div>

          {/* Logo 2: Crystal Tech */}
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold text-white mb-4">Crystal Tech</h3>
            <svg width="200" height="200" viewBox="0 0 200 200" className="mx-auto">
              <defs>
                <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="50%" stopColor="#0891B2" />
                  <stop offset="100%" stopColor="#0EA5E9" />
                </linearGradient>
                <filter id="glow2">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Hexágono principal cristalino */}
              <polygon
                points="100,15 170,52.5 170,127.5 100,165 30,127.5 30,52.5"
                fill="rgba(16, 185, 129, 0.1)"
                stroke="url(#grad2)"
                strokeWidth="4"
                filter="url(#glow2)"
              />

              {/* Estructura interna */}
              <polygon
                points="100,35 150,62.5 150,117.5 100,145 50,117.5 50,62.5"
                fill="none"
                stroke="#0891B2"
                strokeWidth="2"
              />

              {/* Brazo robótico estilizado */}
              <g transform="translate(100,90)">
                <rect x="-25" y="-3" width="50" height="6" fill="#059669" rx="3" />
                <rect x="20" y="-8" width="15" height="16" fill="#0891B2" rx="2" />
                <circle cx="35" cy="0" r="5" fill="#0EA5E9" />
                <rect x="-40" y="-2" width="15" height="4" fill="#059669" rx="2" />
              </g>

              {/* Patrones de red neuronal */}
              <g opacity="0.6">
                <circle cx="70" cy="60" r="3" fill="#10B981" />
                <circle cx="130" cy="60" r="3" fill="#10B981" />
                <circle cx="70" cy="120" r="3" fill="#0EA5E9" />
                <circle cx="130" cy="120" r="3" fill="#0EA5E9" />
                <line x1="70" y1="60" x2="130" y2="60" stroke="#059669" strokeWidth="1" />
                <line x1="70" y1="120" x2="130" y2="120" stroke="#0891B2" strokeWidth="1" />
                <line x1="70" y1="60" x2="70" y2="120" stroke="#0EA5E9" strokeWidth="1" />
                <line x1="130" y1="60" x2="130" y2="120" stroke="#0EA5E9" strokeWidth="1" />
              </g>

              <text x="100" y="185" textAnchor="middle" fill="url(#grad2)" fontSize="12" fontWeight="bold">
                VERIDIAN HEX
              </text>
            </svg>
          </div>

          {/* Logo 3: Minimal Smart */}
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold text-white mb-4">Minimal Smart</h3>
            <svg width="200" height="200" viewBox="0 0 200 200" className="mx-auto">
              <defs>
                <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#047857" />
                  <stop offset="100%" stopColor="#0284C7" />
                </linearGradient>
              </defs>

              {/* Hexágonos interconectados */}
              <g transform="translate(100,100)">
                {/* Hexágono central */}
                <polygon
                  points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15"
                  fill="none"
                  stroke="url(#grad3)"
                  strokeWidth="3"
                />

                {/* Hexágonos satélite */}
                <g transform="translate(0,-50)">
                  <polygon points="0,-15 13,-7.5 13,7.5 0,15 -13,7.5 -13,-7.5" fill="#047857" opacity="0.7" />
                </g>

                <g transform="translate(43,-25)">
                  <polygon points="0,-15 13,-7.5 13,7.5 0,15 -13,7.5 -13,-7.5" fill="#0284C7" opacity="0.7" />
                </g>

                <g transform="translate(43,25)">
                  <polygon points="0,-15 13,-7.5 13,7.5 0,15 -13,7.5 -13,-7.5" fill="#047857" opacity="0.7" />
                </g>

                <g transform="translate(0,50)">
                  <polygon points="0,-15 13,-7.5 13,7.5 0,15 -13,7.5 -13,-7.5" fill="#0284C7" opacity="0.7" />
                </g>

                <g transform="translate(-43,25)">
                  <polygon points="0,-15 13,-7.5 13,7.5 0,15 -13,7.5 -13,-7.5" fill="#047857" opacity="0.7" />
                </g>

                <g transform="translate(-43,-25)">
                  <polygon points="0,-15 13,-7.5 13,7.5 0,15 -13,7.5 -13,-7.5" fill="#0284C7" opacity="0.7" />
                </g>

                {/* Conexiones */}
                <line x1="0" y1="-30" x2="0" y2="-35" stroke="#047857" strokeWidth="2" />
                <line x1="26" y1="-15" x2="30" y2="-25" stroke="#0284C7" strokeWidth="2" />
                <line x1="26" y1="15" x2="30" y2="25" stroke="#047857" strokeWidth="2" />
                <line x1="0" y1="30" x2="0" y2="35" stroke="#0284C7" strokeWidth="2" />
                <line x1="-26" y1="15" x2="-30" y2="25" stroke="#047857" strokeWidth="2" />
                <line x1="-26" y1="-15" x2="-30" y2="-25" stroke="#0284C7" strokeWidth="2" />

                {/* Chip central */}
                <rect x="-8" y="-8" width="16" height="16" fill="none" stroke="url(#grad3)" strokeWidth="2" rx="2" />
                <rect x="-4" y="-4" width="8" height="8" fill="#0284C7" opacity="0.8" rx="1" />
              </g>

              <text x="100" y="180" textAnchor="middle" fill="url(#grad3)" fontSize="14" fontWeight="bold">
                VHT
              </text>
            </svg>
          </div>

          {/* Logo 4: Dynamic Matrix */}
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold text-white mb-4">Dynamic Matrix</h3>
            <svg width="200" height="200" viewBox="0 0 200 200" className="mx-auto">
              <defs>
                <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#065F46" />
                  <stop offset="50%" stopColor="#0891B2" />
                  <stop offset="100%" stopColor="#0EA5E9" />
                </linearGradient>
                <filter id="pulse">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Matrix hexagonal */}
              <g transform="translate(100,100)">
                {/* Hexágono principal con efecto dinámico */}
                <polygon
                  points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20"
                  fill="rgba(8, 145, 178, 0.1)"
                  stroke="url(#grad4)"
                  strokeWidth="3"
                  filter="url(#pulse)"
                />

                {/* Ondas cerebrales */}
                <path
                  d="M -30,-10 Q -20,-20 -10,-10 T 10,-10 T 30,-10"
                  fill="none"
                  stroke="#0EA5E9"
                  strokeWidth="2"
                  opacity="0.8"
                />
                <path
                  d="M -30,0 Q -20,10 -10,0 T 10,0 T 30,0"
                  fill="none"
                  stroke="#0891B2"
                  strokeWidth="2"
                  opacity="0.6"
                />
                <path
                  d="M -30,10 Q -20,0 -10,10 T 10,10 T 30,10"
                  fill="none"
                  stroke="#065F46"
                  strokeWidth="2"
                  opacity="0.4"
                />

                {/* Engranajes mecánicos */}
                <g transform="translate(-20,-20)">
                  <circle cx="0" cy="0" r="8" fill="none" stroke="#0891B2" strokeWidth="2" />
                  <polygon points="0,-8 3,-5 0,-2 -3,-5" fill="#0EA5E9" />
                  <polygon points="8,0 5,3 2,0 5,-3" fill="#0EA5E9" />
                  <polygon points="0,8 -3,5 0,2 3,5" fill="#0EA5E9" />
                  <polygon points="-8,0 -5,-3 -2,0 -5,3" fill="#0EA5E9" />
                </g>

                <g transform="translate(20,20)">
                  <circle cx="0" cy="0" r="6" fill="none" stroke="#065F46" strokeWidth="2" />
                  <polygon points="0,-6 2,-4 0,-2 -2,-4" fill="#0891B2" />
                  <polygon points="6,0 4,2 2,0 4,-2" fill="#0891B2" />
                  <polygon points="0,6 -2,4 0,2 2,4" fill="#0891B2" />
                  <polygon points="-6,0 -4,-2 -2,0 -4,2" fill="#0891B2" />
                </g>

                {/* Efecto holográfico */}
                <rect x="-35" y="-25" width="70" height="2" fill="#0EA5E9" opacity="0.3" />
                <rect x="-35" y="-15" width="70" height="1" fill="#0891B2" opacity="0.2" />
                <rect x="-35" y="15" width="70" height="1" fill="#065F46" opacity="0.2" />
                <rect x="-35" y="25" width="70" height="2" fill="#0EA5E9" opacity="0.3" />
              </g>

              <text x="100" y="185" textAnchor="middle" fill="url(#grad4)" fontSize="12" fontWeight="bold">
                TECHNOLOGIES
              </text>
            </svg>
          </div>

          {/* Logo 5: Circuit Robotic */}
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold text-white mb-4">Circuit Robotic</h3>
            <svg width="200" height="200" viewBox="0 0 200 200" className="mx-auto">
              <defs>
                <linearGradient id="grad5" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#064E3B" />
                  <stop offset="50%" stopColor="#0F766E" />
                  <stop offset="100%" stopColor="#0891B2" />
                </linearGradient>
              </defs>

              {/* Hexágono con circuitos */}
              <polygon
                points="100,25 155,57.5 155,122.5 100,155 45,122.5 45,57.5"
                fill="rgba(15, 118, 110, 0.1)"
                stroke="url(#grad5)"
                strokeWidth="3"
              />

              {/* Circuitos complejos */}
              <g stroke="#0F766E" strokeWidth="1.5" fill="none">
                {/* Líneas horizontales */}
                <line x1="60" y1="70" x2="140" y2="70" />
                <line x1="60" y1="90" x2="140" y2="90" />
                <line x1="60" y1="110" x2="140" y2="110" />

                {/* Líneas verticales */}
                <line x1="80" y1="50" x2="80" y2="130" />
                <line x1="100" y1="50" x2="100" y2="130" />
                <line x1="120" y1="50" x2="120" y2="130" />

                {/* Conexiones diagonales */}
                <line x1="70" y1="60" x2="90" y2="80" />
                <line x1="110" y1="60" x2="130" y2="80" />
                <line x1="70" y1="120" x2="90" y2="100" />
                <line x1="110" y1="120" x2="130" y2="100" />
              </g>

              {/* Nodos de circuito */}
              <circle cx="80" cy="70" r="4" fill="#0891B2" />
              <circle cx="100" cy="70" r="4" fill="#064E3B" />
              <circle cx="120" cy="70" r="4" fill="#0891B2" />
              <circle cx="80" cy="90" r="3" fill="#0F766E" />
              <circle cx="120" cy="90" r="3" fill="#0F766E" />
              <circle cx="80" cy="110" r="4" fill="#0891B2" />
              <circle cx="100" cy="110" r="4" fill="#064E3B" />
              <circle cx="120" cy="110" r="4" fill="#0891B2" />

              {/* Elementos mecatrónicos */}
              <g transform="translate(100,90)">
                {/* Procesador central */}
                <rect x="-12" y="-12" width="24" height="24" fill="none" stroke="#0891B2" strokeWidth="2" rx="2" />
                <rect x="-8" y="-8" width="16" height="16" fill="#064E3B" opacity="0.8" rx="1" />
                <rect x="-4" y="-4" width="8" height="8" fill="#0F766E" rx="1" />

                {/* Pines del procesador */}
                <rect x="-15" y="-2" width="3" height="4" fill="#0891B2" />
                <rect x="12" y="-2" width="3" height="4" fill="#0891B2" />
                <rect x="-2" y="-15" width="4" height="3" fill="#0891B2" />
                <rect x="-2" y="12" width="4" height="3" fill="#0891B2" />
              </g>

              {/* Conexiones neurales */}
              <g opacity="0.6">
                <path d="M 70,50 Q 100,40 130,50" stroke="#0891B2" strokeWidth="1" fill="none" />
                <path d="M 70,130 Q 100,140 130,130" stroke="#0F766E" strokeWidth="1" fill="none" />
                <circle cx="70" cy="50" r="2" fill="#0891B2" />
                <circle cx="130" cy="50" r="2" fill="#0891B2" />
                <circle cx="70" cy="130" r="2" fill="#0F766E" />
                <circle cx="130" cy="130" r="2" fill="#0F766E" />
              </g>

              <text x="100" y="175" textAnchor="middle" fill="url(#grad5)" fontSize="10" fontWeight="bold">
                VERIDIAN • HEX • TECH
              </text>
            </svg>
          </div>

          {/* Logo 6: Bonus - Futuristic Emblem */}
          <div className="bg-gray-800 rounded-lg p-8 text-center md:col-span-2 lg:col-span-1">
            <h3 className="text-xl font-semibold text-white mb-4">Futuristic Emblem</h3>
            <svg width="200" height="200" viewBox="0 0 200 200" className="mx-auto">
              <defs>
                <radialGradient id="radial1" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0EA5E9" />
                  <stop offset="50%" stopColor="#0891B2" />
                  <stop offset="100%" stopColor="#064E3B" />
                </radialGradient>
                <filter id="futuristicGlow">
                  <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Anillo exterior */}
              <circle cx="100" cy="100" r="80" fill="none" stroke="url(#radial1)" strokeWidth="2" opacity="0.5" />

              {/* Hexágono principal futurista */}
              <polygon
                points="100,30 150,65 150,135 100,170 50,135 50,65"
                fill="rgba(14, 165, 233, 0.1)"
                stroke="url(#radial1)"
                strokeWidth="4"
                filter="url(#futuristicGlow)"
              />

              {/* Estructura interna compleja */}
              <g transform="translate(100,100)">
                {/* Cruz central */}
                <line x1="-25" y1="0" x2="25" y2="0" stroke="#0EA5E9" strokeWidth="3" />
                <line x1="0" y1="-25" x2="0" y2="25" stroke="#0891B2" strokeWidth="3" />

                {/* Círculos concéntricos */}
                <circle cx="0" cy="0" r="15" fill="none" stroke="#064E3B" strokeWidth="2" />
                <circle cx="0" cy="0" r="25" fill="none" stroke="#0891B2" strokeWidth="1" opacity="0.7" />
                <circle cx="0" cy="0" r="35" fill="none" stroke="#0EA5E9" strokeWidth="1" opacity="0.5" />

                {/* Elementos robóticos */}
                <rect x="-3" y="-3" width="6" height="6" fill="#0EA5E9" transform="rotate(45)" />

                {/* Puntos de conexión */}
                <circle cx="20" cy="0" r="3" fill="#0891B2" />
                <circle cx="-20" cy="0" r="3" fill="#0891B2" />
                <circle cx="0" cy="20" r="3" fill="#064E3B" />
                <circle cx="0" cy="-20" r="3" fill="#064E3B" />

                {/* Detalles futuristas */}
                <polygon points="-30,-5 -20,-2 -20,2 -30,5" fill="#0EA5E9" opacity="0.8" />
                <polygon points="30,-5 20,-2 20,2 30,5" fill="#0EA5E9" opacity="0.8" />
                <polygon points="-5,-30 -2,-20 2,-20 5,-30" fill="#0891B2" opacity="0.8" />
                <polygon points="-5,30 -2,20 2,20 5,30" fill="#0891B2" opacity="0.8" />
              </g>

              {/* Texto elegante */}
              <text
                x="100"
                y="190"
                textAnchor="middle"
                fill="url(#radial1)"
                fontSize="11"
                fontWeight="bold"
                letterSpacing="2"
              >
                V • H • T
              </text>
            </svg>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-300 text-lg">
            🚀 <strong>Veridian Hex Technologies</strong> - El futuro de la IA, Robótica y Domótica
          </p>
          <p className="text-gray-400 mt-2">
            Cada logo representa tu visión: <span className="text-emerald-400">NEXUS + Robótica + Domótica + IA</span>
          </p>
        </div>
      </div>
    </div>
  )
}
