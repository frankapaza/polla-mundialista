import CrearForm from './CrearForm'

export default function CrearPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-slate-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏆</div>
          <h1 className="text-3xl font-bold text-white">Crear grupo</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Elegí un nombre y compartí el link con tus amigos
          </p>
        </div>
        <CrearForm />
      </div>
    </main>
  )
}
