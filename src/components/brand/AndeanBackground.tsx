/**
 * Fondo decorativo: nubes de color difuminadas y piezas del repertorio
 * geométrico andino flotando en distintos planos.
 *
 * Va sin color de base a propósito, para que se vea el pallay tejido del `body`
 * por debajo: queda textura de papel + nubes + piezas, en ese orden.
 *
 * Es puramente decorativo (`aria-hidden`) y no intercepta el puntero.
 */
export function AndeanBackground() {
  return (
    <div className="fixed inset-0 -z-10 w-full h-full pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Nubes de color */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-andino-morado/12 rounded-full blur-[100px]" />
      <div className="absolute top-[35%] -right-20 w-[35rem] h-[35rem] bg-andino-coral/9 rounded-full blur-[120px]" />
      <div className="absolute -bottom-32 left-[25%] w-96 h-96 bg-andino-oro/12 rounded-full blur-[100px]" />
      <div className="absolute top-[20%] left-[40%] w-64 h-64 bg-andino-azul/6 rounded-full blur-[90px]" />

      {/* 1. Chakana — superior izquierda */}
      <div className="absolute top-[8%] left-[5%] w-32 h-32 opacity-28 rotate-12 animate-float">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 40 0 H 60 V 20 H 80 V 40 H 100 V 60 H 80 V 80 H 60 V 100 H 40 V 80 H 20 V 60 H 0 V 40 H 20 V 20 H 40 Z" fill="#7C43BD" />
          <path d="M 45 10 H 55 V 25 H 75 V 45 H 90 V 55 H 75 V 75 H 55 V 90 H 45 V 75 H 25 V 55 H 10 V 45 H 25 V 25 H 45 Z" fill="#FFB800" />
          <rect x="40" y="40" width="20" height="20" fill="#FDF8EB" />
          <circle cx="50" cy="50" r="5" fill="#E64A19" />
        </svg>
      </div>

      {/* 2. Fragmento de wiphala — inferior derecha */}
      <div className="absolute bottom-[12%] right-[8%] w-48 h-48 opacity-20 -rotate-6 animate-float-reverse">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg" xmlns="http://www.w3.org/2000/svg">
          <rect x="40" y="20" width="20" height="20" fill="#FFB800" />
          <rect x="20" y="40" width="20" height="20" fill="#FFB800" />
          <rect x="40" y="40" width="20" height="20" fill="#FF5722" />
          <rect x="60" y="40" width="20" height="20" fill="#7C43BD" />
          <rect x="40" y="60" width="20" height="20" fill="#43A047" />
          <rect x="60" y="60" width="20" height="20" fill="#FF5722" />
          <rect x="80" y="60" width="20" height="20" fill="#1274A1" />
          <rect x="60" y="80" width="20" height="20" fill="#E64A19" />
        </svg>
      </div>

      {/* 3. Tocapu de la dualidad — centro derecha */}
      <div className="absolute top-[40%] right-[12%] w-28 h-28 opacity-30 rotate-12 animate-float">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="5" width="90" height="90" fill="#1274A1" stroke="#E64A19" strokeWidth="4" />
          <polygon points="5,5 95,5 5,95" fill="#FF5722" />
          <polygon points="50,20 80,50 50,80 20,50" fill="#FDF8EB" />
          <polygon points="50,35 65,50 50,65 35,50" fill="#7C43BD" />
          <circle cx="50" cy="50" r="4" fill="#FFB800" />
        </svg>
      </div>

      {/* 4. Inti, el sol andino — superior derecha */}
      <div className="absolute top-[10%] right-[20%] w-32 h-32 opacity-25 animate-spin-slow">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" xmlns="http://www.w3.org/2000/svg">
          <rect x="40" y="0" width="20" height="20" fill="#E64A19" />
          <rect x="40" y="80" width="20" height="20" fill="#E64A19" />
          <rect x="0" y="40" width="20" height="20" fill="#E64A19" />
          <rect x="80" y="40" width="20" height="20" fill="#E64A19" />
          <rect x="20" y="20" width="15" height="15" fill="#FFB800" />
          <rect x="65" y="20" width="15" height="15" fill="#FFB800" />
          <rect x="20" y="65" width="15" height="15" fill="#FFB800" />
          <rect x="65" y="65" width="15" height="15" fill="#FFB800" />
          <circle cx="50" cy="50" r="20" fill="#FFB800" stroke="#E64A19" strokeWidth="4" />
          <circle cx="50" cy="50" r="8" fill="#FDF8EB" />
        </svg>
      </div>

      {/* 5. Pallay en zigzag — cruzando por la izquierda */}
      <div className="absolute top-[30%] left-[-8%] w-72 h-36 opacity-20 -rotate-6 animate-float-reverse">
        <svg viewBox="0 0 200 100" className="w-full h-full" fill="none" strokeWidth="14" strokeLinecap="square" strokeLinejoin="miter" xmlns="http://www.w3.org/2000/svg">
          <polyline points="0,50 30,20 60,80 90,20 120,80 150,20 180,80 210,50" stroke="#FFB800" />
          <polyline points="0,70 30,40 60,100 90,40 120,100 150,40 180,100 210,70" stroke="#1274A1" />
        </svg>
      </div>

      {/* 6. Apu escalonado — inferior izquierda */}
      <div className="absolute bottom-[8%] left-[12%] w-44 h-44 opacity-28 rotate-6 animate-float">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg" xmlns="http://www.w3.org/2000/svg">
          <path d="M 50 10 L 65 25 H 75 L 85 40 H 95 L 100 50 V 90 H 0 V 50 L 5 40 H 15 L 25 25 H 35 Z" fill="#43A047" />
          <path d="M 50 25 L 60 35 H 70 L 75 45 H 25 L 30 35 H 40 Z" fill="#FDF8EB" />
          <rect x="40" y="60" width="20" height="20" fill="#7C43BD" />
          <rect x="45" y="65" width="10" height="10" fill="#FFB800" />
        </svg>
      </div>

      {/* 7. Chakana menor y tocapu rectangular — centro abajo */}
      <div className="absolute bottom-[15%] left-[45%] w-20 h-20 opacity-20 -rotate-12 animate-float-fast">
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="100" height="100" fill="#1274A1" />
          <rect x="25" y="25" width="50" height="50" fill="#FDF8EB" />
          <polygon points="50,35 65,50 50,65 35,50" fill="#E64A19" />
        </svg>
      </div>
      <div className="absolute top-[65%] left-[30%] w-28 h-16 opacity-25 rotate-12 animate-float">
        <svg viewBox="0 0 200 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="200" height="100" fill="#7C43BD" />
          <rect x="20" y="20" width="60" height="60" fill="#FFB800" />
          <rect x="120" y="20" width="60" height="60" fill="#FF5722" />
          <rect x="40" y="40" width="20" height="20" fill="#FDF8EB" />
          <rect x="140" y="40" width="20" height="20" fill="#FDF8EB" />
        </svg>
      </div>

      {/* 8. Estrellas y geometría dispersa */}
      <div className="absolute top-[45%] left-[15%] w-5 h-5 bg-andino-oro rotate-45 animate-spin-slow opacity-25" />
      <div className="absolute top-[25%] right-[45%] w-6 h-6 border-4 border-andino-terracota rotate-45 opacity-20 animate-float-fast" />
      <div className="absolute bottom-[25%] right-[30%] w-4 h-4 bg-andino-verde rotate-12 animate-spin-slow-reverse opacity-22" />
      <div className="absolute bottom-[40%] left-[35%] w-10 h-10 border-[6px] border-andino-morado rotate-45 opacity-22 animate-float-reverse" />

      {/* Escaleras sueltas (chakana parcial) */}
      <div className="absolute top-[60%] right-[38%] opacity-28 animate-float-reverse rotate-6">
        <svg width="45" height="45" viewBox="0 0 40 40" fill="#E64A19" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 H10 V30 H20 V20 H30 V10 H40 V0 H0 Z" />
        </svg>
      </div>

      <div className="absolute top-[15%] left-[35%] opacity-22 animate-float">
        <svg width="30" height="30" viewBox="0 0 40 40" fill="#1274A1" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,0 H40 V10 H30 V20 H20 V30 H10 V40 H0 Z" />
        </svg>
      </div>
    </div>
  );
}
