import { Link } from 'react-router-dom'
import { MessageSquarePlus } from 'lucide-react'
import { BackButton } from '../components/ui/BackButton'

export function HelpPage() {
  return (
    <div className="relative min-h-dvh bg-hbl-bg text-hbl-text p-4 pb-12 max-w-lg mx-auto">
      <BackButton to="/" label="Inicio" />

      <h1 className="text-2xl font-bold text-hbl-accent mb-1 mt-10">
        Guia para padres
      </h1>
      <p className="text-hbl-text-muted text-sm mb-6">
        HandBallLab — Como seguir y anotar partidos
      </p>

      {/* Instalar */}
      <Section title="1. Instalar la app">
        <Note>No hace falta descargar nada de la App Store ni Google Play.</Note>

        <h4 className="font-semibold text-sm mt-3 mb-1">Android (Chrome)</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Abre la app en Chrome</li>
          <li>Pulsa el boton <B>Instalar app en tu movil</B> en la pantalla de inicio</li>
          <li>Confirma en el dialogo que aparece</li>
          <li>La app se anade a tu pantalla de inicio como un icono normal</li>
        </ol>

        <h4 className="font-semibold text-sm mt-3 mb-1">iPhone / iPad (Safari)</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Abre la app en <B>Safari</B> (no funciona en Chrome para iOS)</li>
          <li>Pulsa el boton <B>Compartir</B> (cuadrado con flecha hacia arriba)</li>
          <li>Desplazate y pulsa <B>Anadir a pantalla de inicio</B></li>
          <li>Confirma pulsando <B>Anadir</B></li>
        </ol>
        <Note>Una vez instalada, abrela siempre desde el icono — asi funciona en pantalla completa y sin conexion.</Note>
      </Section>

      {/* Espectador */}
      <Section title="2. Seguir un partido (espectador)">
        <Note>Los espectadores no necesitan codigo — acceden directamente con un enlace o desde el Centro de partidos.</Note>

        <h4 className="font-semibold text-sm mt-3 mb-1">Opcion A: Centro de partidos</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Abre la app</li>
          <li>Pulsa <B>Centro de partidos</B> en la pantalla principal</li>
          <li>Veras los partidos en tres secciones: <B>En directo</B>, <B>Recientes</B> y <B>Anteriores</B></li>
          <li>Pulsa en cualquier partido para ver el marcador</li>
        </ol>

        <h4 className="font-semibold text-sm mt-3 mb-1">Opcion B: Con enlace directo</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>El organizador comparte un enlace por WhatsApp</li>
          <li>Pulsa el enlace — se abre directamente el marcador</li>
        </ol>

        <p className="text-sm mt-2 text-hbl-text-muted">
          En ambos casos veras el marcador en tiempo real: resultado, reloj, tiempos muertos y
          exclusiones. No puedes modificar nada — solo mirar. Cuando el anotador pide un tiempo muerto, aparece un banner <B>Tiempo Muerto</B> con el nombre del equipo. Para salir, pulsa <B>Salir del partido</B> en la esquina superior izquierda.
        </p>
        <p className="text-sm mt-2 text-hbl-text-muted">
          Si nadie ha reclamado el rol de anotador, veras un boton para reclamarlo directamente — sin codigo.
        </p>
      </Section>

      {/* Anotador */}
      <Section title="3. Llevar el marcador (anotador)">
        <p className="text-sm mb-2">
          Si te han asignado llevar el marcador de un partido:
        </p>

        <h4 className="font-semibold text-sm mt-3 mb-1">Antes del partido</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Abre la app</li>
          <li>Ve al partido desde <B>Centro de partidos</B> o con el enlace del organizador</li>
          <li>Si el rol de anotador esta libre, veras un boton para reclamarlo</li>
          <li>Pulsa el boton — ya tienes los controles activos</li>
        </ol>

        <h4 className="font-semibold text-sm mt-3 mb-1">Durante el partido</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-hbl-border text-left">
                <th className="py-1 pr-2 font-semibold">Accion</th>
                <th className="py-1 font-semibold">Como</th>
              </tr>
            </thead>
            <tbody className="text-hbl-text-muted">
              <Row action="Iniciar/pausar reloj" how="Boton grande central" />
              <Row action="Sumar gol" how="Boton + junto al equipo que marco" />
              <Row action="Restar gol (error)" how="Boton - junto al equipo" />
              <Row
                action="Tiempo muerto"
                how="Boton Tiempo muerto local / visitante (pausa el reloj)"
              />
              <Row
                action="Exclusion (2 min)"
                how="Boton Exclusion local / visitante"
              />
              <Row
                action="Quitar exclusion"
                how="Pulsa la X junto al temporizador (regla Sub-12)"
              />
              <Row
                action="Siguiente parte"
                how="Boton Siguiente parte (cuando pares el reloj)"
              />
              <Row
                action="Terminar partido"
                how="Boton Terminar partido (ultima parte)"
              />
              <Row
                action="Cancelar partido"
                how="Boton Cancelar partido (se pierde todo)"
              />
            </tbody>
          </table>
        </div>

        <h4 className="font-semibold text-sm mt-3 mb-1">Reglas rapidas</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-hbl-text-muted">
          <li>Maximo 3 exclusiones activas por equipo a la vez</li>
          <li>Los tiempos muertos se resetean en cada parte</li>
          <li>El reloj cuenta hacia arriba</li>
        </ul>

        <h4 className="font-semibold text-sm mt-3 mb-1">
          Si pierdes conexion
        </h4>
        <p className="text-sm text-hbl-text-muted">
          No te preocupes — la app guarda todo en tu movil. Cuando vuelvas a
          tener conexion, se sincroniza automaticamente.
        </p>
      </Section>

      {/* Roles */}
      <Section title="4. Roles y acceso">
        <p className="text-sm mb-2">
          Los espectadores acceden <B>sin codigo</B> — con un enlace o desde el Centro de partidos.
          Los operadores reclaman su rol directamente desde la vista del partido:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-hbl-border text-left">
                <th className="py-1 pr-2 font-semibold">Rol</th>
                <th className="py-1 pr-2 font-semibold">Acceso</th>
                <th className="py-1 font-semibold">Que puede hacer</th>
              </tr>
            </thead>
            <tbody className="text-hbl-text-muted">
              <tr className="border-b border-hbl-border/50">
                <td className="py-1 pr-2">Espectador</td>
                <td className="py-1 pr-2">Enlace directo o Centro de partidos</td>
                <td className="py-1">Solo ver el marcador</td>
              </tr>
              <tr className="border-b border-hbl-border/50">
                <td className="py-1 pr-2">Anotador</td>
                <td className="py-1 pr-2">Primero en reclamar el rol desde el partido</td>
                <td className="py-1">Controlar marcador, reloj, exclusiones</td>
              </tr>
              <tr>
                <td className="py-1 pr-2">Estadisticas</td>
                <td className="py-1 pr-2">Primero en reclamar el rol desde el partido</td>
                <td className="py-1">Registrar jugadas (proximamente)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Note>
          Solo una persona puede ocupar cada rol a la vez — si ya esta reclamado, el boton no aparece.
        </Note>
      </Section>

      {/* Personal settings */}
      <Section title="5. Ajustes personales">
        <p className="text-sm mb-2">
          Desde la pestana <B>Mas</B> (esquina inferior derecha) puedes personalizar la app:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><B>Tema</B>: cambia entre modo oscuro y modo claro</li>
          <li><B>Tamano del marcador</B>: elige entre Pequeno, Normal o Grande — util si ves el marcador desde lejos</li>
          <li><B>Liberar el marcador</B>: si eres el anotador y quieres ceder el control, pulsa <B>Soltar el marcador</B> desde la pantalla del partido</li>
        </ul>
        <Note>
          Todos los ajustes se guardan automaticamente en tu dispositivo.
        </Note>
      </Section>

      {/* Player cards */}
      <Section title="6. Fichas de jugadores">
        <p className="text-sm mb-2">
          Cada jugador tiene una <B>ficha coleccionable</B> con su nombre, dorsal, posicion y equipo — como una carta de videojuego.
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Abre la app</li>
          <li>Ve a <B>Administracion → Jugadores</B></li>
          <li>Pulsa en el nombre de un jugador para ver su ficha</li>
        </ol>
        <Note>
          Las fichas son publicas — no necesitas codigo ni permisos. Los ninos pueden hacer captura de pantalla y compartirla.
        </Note>
      </Section>

      {/* FAQ */}
      <Section title="7. Preguntas frecuentes">
        <dl className="space-y-3 text-sm">
          <Faq q="Necesito crear cuenta?">
            No. No hay registro ni contrasena. Los espectadores no necesitan nada — solo el enlace. Los anotadores reclaman el rol directamente desde el partido.
          </Faq>
          <Faq q="Funciona sin internet?">
            Si. El anotador puede seguir marcando goles y se sincroniza cuando
            vuelva la conexion.
          </Faq>
          <Faq q="Puedo seguir varios partidos?">
            Si, pero uno a la vez. Para cambiar, vuelve al inicio y abre otro
            enlace.
          </Faq>
          <Faq q="Que pasa si cierro la app por error?">
            Si eres anotador, vuelve a abrir el partido — tu rol se mantiene mientras no lo libere otro.
          </Faq>
          <Faq q="Quien crea los partidos?">
            Solo el organizador (Juan). Los padres no necesitan crear partidos ni
            torneos.
          </Faq>
        </dl>
      </Section>

      {/* Suggestions link */}
      <div className="mt-8 mb-4 text-center">
        <Link
          to="/suggestions"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-hbl-surface border border-hbl-border hover:border-hbl-accent transition-colors text-sm active:scale-95"
        >
          <MessageSquarePlus className="w-4 h-4 text-hbl-accent" />
          Tienes una idea? Enviar sugerencia
        </Link>
      </div>

      <p className="text-xs text-hbl-text-muted/50 text-center mt-4">
        Un proyecto de Civeira Lab
      </p>
    </div>
  )
}

// --- Small helpers ---

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-6">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {children}
    </section>
  )
}

function B({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-hbl-text">{children}</span>
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-hbl-text-muted bg-hbl-surface rounded-lg p-2 mt-2 border border-hbl-border">
      {children}
    </p>
  )
}

function Row({ action, how }: { action: string; how: string }) {
  return (
    <tr className="border-b border-hbl-border/50">
      <td className="py-1 pr-2 font-medium text-hbl-text">{action}</td>
      <td className="py-1">{how}</td>
    </tr>
  )
}

function Faq({
  q,
  children,
}: {
  q: string
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="font-semibold text-hbl-text">{q}</dt>
      <dd className="text-hbl-text-muted">{children}</dd>
    </div>
  )
}
