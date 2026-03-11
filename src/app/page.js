'use client'
import { useState, useEffect, useCallback } from 'react'

// ── Paleta ────────────────────────────────────────────────────────────
const C = {
  bg: '#0F1117', surface: '#181C25', surfaceHigh: '#1F2535',
  border: '#2A3045', accent: '#4F8EF7', accentSoft: '#1A2D4F',
  green: '#34D399', greenSoft: '#0D2E22', amber: '#FBBF24', amberSoft: '#2E2008',
  red: '#F87171', redSoft: '#2E1010', text: '#E8ECF4',
  textMuted: '#7A8499', textDim: '#4A5268',
}

const SPECIALIST_ROLES = [
  'Neuropsicólogo/a', 'Psicólogo/a Clínico/a', 'Terapeuta Ocupacional',
  'Psiquiatra', 'Fonoaudiólogo/a', 'Trabajador/a Social', 'Médico/a', 'Otro',
]

const SECTIONS_BY_ROLE = {
  'Neuropsicólogo/a':      ['capacidades_intelectuales', 'observacion_lectora', 'conclusion'],
  'Psicólogo/a Clínico/a': ['escala_depresion_ansiedad', 'valoracion_autismo', 'conclusion', 'derivaciones_clinicas'],
  'Terapeuta Ocupacional': ['perfil_sensorial', 'derivaciones_to'],
  'Psiquiatra':            ['conclusion', 'derivaciones_clinicas'],
  'Fonoaudiólogo/a':       ['observacion_lectora', 'derivaciones_clinicas'],
  'Trabajador/a Social':   ['derivaciones_familiar', 'derivaciones_universitario'],
  'Médico/a':              ['conclusion', 'derivaciones_clinicas'],
  'Otro':                  ['observacion_directa'],
}

const SECTION_LABELS = {
  capacidades_intelectuales:  'Capacidades Intelectuales (WAIS-IV)',
  observacion_lectora:        'Observación Lectora (PROLEC-R)',
  perfil_sensorial:           'Perfil de Procesamiento Sensorial',
  escala_depresion_ansiedad:  'Escala Depresión y Ansiedad (ZUNG)',
  valoracion_autismo:         'Valoración Autismo (ADI-R / ADOS-2)',
  conclusion:                 'Conclusión Diagnóstica',
  derivaciones_clinicas:      'Derivaciones Clínicas',
  derivaciones_familiar:      'Derivaciones Familiares',
  derivaciones_universitario: 'Derivaciones Universitarias',
  derivaciones_to:            'Derivaciones Terapia Ocupacional',
  observacion_directa:        'Observación Directa',
}

// ── Storage (localStorage) ────────────────────────────────────────────
const loadCases = () => {
  try { return JSON.parse(localStorage.getItem('informadx_cases') || '{}') } catch { return {} }
}
const saveCases = (cases) => {
  try { localStorage.setItem('informadx_cases', JSON.stringify(cases)) } catch {}
}

// ── API calls ─────────────────────────────────────────────────────────
async function apiCall(action, payload) {
  const res = await fetch('/api/generate-docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  })
  return res.json()
}

// ── UI primitivos ─────────────────────────────────────────────────────
const Badge = ({ color = 'gray', children }) => {
  const map = {
    blue:  { bg: C.accentSoft, text: C.accent,  border: '#1E3A6E' },
    green: { bg: C.greenSoft,  text: C.green,   border: '#0D4A2A' },
    amber: { bg: C.amberSoft,  text: C.amber,   border: '#4A3008' },
    red:   { bg: C.redSoft,    text: C.red,     border: '#4A1010' },
    gray:  { bg: '#1A1E2A',    text: C.textMuted, border: C.border },
  }
  const s = map[color] || map.gray
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 600,
      letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

const Btn = ({ onClick, variant = 'primary', disabled, children, small, full }) => {
  const map = {
    primary: { bg: C.accent,    color: '#fff',      border: C.accent },
    ghost:   { bg: 'transparent', color: C.textMuted, border: C.border },
    danger:  { bg: C.redSoft,   color: C.red,       border: '#4A1010' },
    success: { bg: C.greenSoft, color: C.green,     border: '#0D4A2A' },
  }
  const s = map[variant] || map.primary
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 8, padding: small ? '6px 14px' : '9px 20px',
      fontSize: small ? 12 : 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1, fontFamily: 'inherit',
      width: full ? '100%' : undefined,
    }}>{children}</button>
  )
}

const Field = ({ label, value, onChange, placeholder, type = 'text', rows }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 5, fontWeight: 500 }}>{label}</div>}
    {rows ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: '9px 12px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none',
          boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6 }} />
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: '9px 12px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none',
          boxSizing: 'border-box' }} />
    )}
  </div>
)

const Sel = ({ label, value, onChange, options }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 5, fontWeight: 500 }}>{label}</div>}
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: '9px 12px', color: value ? C.text : C.textMuted, fontSize: 13,
        fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}>
      <option value=''>— Seleccionar —</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
)

const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: 20, cursor: onClick ? 'pointer' : undefined, ...style }}>
    {children}
  </div>
)

// ── VISTA: Home ───────────────────────────────────────────────────────
function HomeView({ onEnter }) {
  const [mode, setMode]       = useState(null)
  const [name, setName]       = useState('')
  const [role, setRole]       = useState('')
  const [code, setCode]       = useState('')
  const [acred, setAcred]     = useState('')

  const ok = name && (mode === 'coordinador' || (role && code))

  return (
    <div style={{ maxWidth: 460, margin: '0 auto', paddingTop: 60 }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: C.accentSoft,
          border: `1px solid ${C.accent}`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>🧠</div>
        <h1 style={{ color: C.text, fontSize: 26, fontWeight: 800, margin: '0 0 6px' }}>InformaDX</h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>Informes diagnósticos colaborativos</p>
      </div>

      {!mode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { m: 'coordinador', icon: '👤', title: 'Soy Coordinador', desc: 'Crear casos, asignar especialistas, aprobar y descargar informes' },
            { m: 'especialista', icon: '🔬', title: 'Soy Especialista', desc: 'Completar mi sección en un caso ya creado' },
          ].map(({ m, icon, title, desc }) => (
            <button key={m} onClick={() => setMode(m)} style={{ background: m === 'coordinador' ? C.accentSoft : C.surfaceHigh,
              border: `1px solid ${m === 'coordinador' ? C.accent : C.border}`, borderRadius: 14,
              padding: '20px', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ color: m === 'coordinador' ? C.accent : C.text, fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{icon} {title}</div>
              <div style={{ color: C.textMuted, fontSize: 12 }}>{desc}</div>
            </button>
          ))}
        </div>
      )}

      {mode && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <span style={{ color: C.text, fontWeight: 600 }}>{mode === 'coordinador' ? '👤 Coordinador' : '🔬 Especialista'}</span>
            <button onClick={() => setMode(null)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 20 }}>←</button>
          </div>
          <Field label='Tu nombre completo' value={name} onChange={setName} placeholder='Ej: Dra. Ana García' />
          {mode === 'especialista' && (
            <>
              <Sel label='Tu especialidad' value={role} onChange={setRole} options={SPECIALIST_ROLES} />
              <Field label='Acreditación / título profesional' value={acred} onChange={setAcred} placeholder='Ej: Acreditada en ADOS-2' />
              <Field label='Código del caso (te lo da el coordinador)' value={code} onChange={setCode} placeholder='Ej: CASO-001' />
            </>
          )}
          <div style={{ marginTop: 6 }}>
            <Btn disabled={!ok} onClick={() => onEnter({ mode, name, role, code: code.toUpperCase(), acred })} full>
              Ingresar →
            </Btn>
          </div>
        </Card>
      )}
    </div>
  )
}

// ── VISTA: Dashboard Coordinador ──────────────────────────────────────
function CoordinatorDash({ user, cases, setCases }) {
  const [view, setView]           = useState('list')
  const [selectedId, setSelectedId] = useState(null)

  if (view === 'create') return <CreateCase user={user} cases={cases} setCases={setCases}
    onBack={() => setView('list')} onCreated={id => { setSelectedId(id); setView('detail') }} />
  if (view === 'detail' && selectedId) return <CaseDetail caseId={selectedId}
    cases={cases} setCases={setCases} user={user} onBack={() => setView('list')} />

  const list = Object.entries(cases)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h2 style={{ color: C.text, margin: 0, fontSize: 22 }}>Casos</h2>
          <div style={{ color: C.textMuted, fontSize: 13, marginTop: 2 }}>Bienvenido/a, {user.name}</div>
        </div>
        <Btn onClick={() => setView('create')}>+ Nuevo Caso</Btn>
      </div>

      {list.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ color: C.textMuted }}>No hay casos todavía. Crea el primero.</div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map(([id, c]) => {
            const total = c.specialists?.length || 0
            const done  = c.specialists?.filter(s => c.sections?.[s.id]?.submitted).length || 0
            const pct   = total ? Math.round((done / total) * 100) : 0
            const badgeColor = c.status === 'aprobado' ? 'green' : c.status === 'revision' ? 'amber' : 'blue'
            return (
              <Card key={id} onClick={() => { setSelectedId(id); setView('detail') }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>{c.patientName}</div>
                    <div style={{ color: C.textMuted, fontSize: 12, marginTop: 3 }}>{id} · {c.evaluationDate}</div>
                  </div>
                  <Badge color={badgeColor}>{c.status === 'aprobado' ? '✓ Aprobado' : c.status === 'revision' ? 'En revisión' : 'En progreso'}</Badge>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: C.textMuted }}>Progreso del equipo</span>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{done}/{total} secciones</span>
                  </div>
                  <div style={{ background: C.bg, borderRadius: 99, height: 6, overflow: 'hidden' }}>
                    <div style={{ background: pct === 100 ? C.green : C.accent, width: `${pct}%`, height: '100%', borderRadius: 99, transition: 'width .4s' }} />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── VISTA: Crear Caso ─────────────────────────────────────────────────
function CreateCase({ user, cases, setCases, onBack, onCreated }) {
  const [step, setStep] = useState(1)
  const [pat, setPat]   = useState({ name: '', dob: '', evalDate: '', residence: 'Arequipa', escolaridad: '', informant: '', motivacion: '' })
  const [specs, setSpecs] = useState([{ id: 1, name: '', role: '', acred: '', sections: [] }])

  const updSpec = (idx, field, val) => setSpecs(s => s.map((sp, i) => i === idx ? { ...sp, [field]: val } : sp))
  const roleChange = (idx, role) => setSpecs(s => s.map((sp, i) => i === idx ? { ...sp, role, sections: SECTIONS_BY_ROLE[role] || [] } : sp))

  const create = () => {
    const id = 'CASO-' + String(Object.keys(cases).length + 1).padStart(3, '0')
    const newCase = {
      id, patientName: pat.name, dob: pat.dob, evaluationDate: pat.evalDate,
      residence: pat.residence, escolaridad: pat.escolaridad, informant: pat.informant,
      motivacion: pat.motivacion, specialists: specs,
      sections: {}, status: 'en_progreso', createdBy: user.name,
      createdAt: new Date().toLocaleDateString('es-PE'),
    }
    const updated = { ...cases, [id]: newCase }
    setCases(updated); saveCases(updated); onCreated(id)
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 20 }}>←</button>
        <h2 style={{ color: C.text, margin: 0 }}>Nuevo Caso</h2>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, alignItems: 'center' }}>
        {['Paciente', 'Equipo', 'Confirmar'].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 12, fontWeight: 700,
              background: step > i+1 ? C.green : step === i+1 ? C.accent : C.surfaceHigh,
              color: step > i+1 || step === i+1 ? '#fff' : C.textDim }}>
              {step > i+1 ? '✓' : i+1}
            </div>
            <span style={{ fontSize: 13, color: step === i+1 ? C.text : C.textDim }}>{s}</span>
            {i < 2 && <span style={{ color: C.textDim }}>›</span>}
          </div>
        ))}
      </div>

      <Card>
        {step === 1 && <>
          <div style={{ color: C.text, fontWeight: 600, marginBottom: 16 }}>Datos del Paciente</div>
          <Field label='Nombre completo' value={pat.name} onChange={v => setPat(p => ({ ...p, name: v }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label='Fecha de nacimiento' value={pat.dob} onChange={v => setPat(p => ({ ...p, dob: v }))} placeholder='dd/mm/aaaa' />
            <Field label='Fecha de evaluación' value={pat.evalDate} onChange={v => setPat(p => ({ ...p, evalDate: v }))} placeholder='dd/mm/aaaa' />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label='Residencia' value={pat.residence} onChange={v => setPat(p => ({ ...p, residence: v }))} />
            <Field label='Escolaridad' value={pat.escolaridad} onChange={v => setPat(p => ({ ...p, escolaridad: v }))} placeholder='Ej: Universitario' />
          </div>
          <Field label='Informante(s)' value={pat.informant} onChange={v => setPat(p => ({ ...p, informant: v }))} placeholder='Ej: María López (madre)' />
          <Field label='Motivo de evaluación' value={pat.motivacion} onChange={v => setPat(p => ({ ...p, motivacion: v }))} rows={3} />
          <Btn disabled={!pat.name || !pat.evalDate} onClick={() => setStep(2)}>Siguiente →</Btn>
        </>}

        {step === 2 && <>
          <div style={{ color: C.text, fontWeight: 600, marginBottom: 4 }}>Equipo Evaluador</div>
          <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 16 }}>Las secciones se asignan automáticamente según el rol.</div>
          {specs.map((sp, idx) => (
            <div key={sp.id} style={{ background: C.surfaceHigh, borderRadius: 10, padding: 14, marginBottom: 12, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: C.textMuted, fontSize: 11, fontWeight: 700 }}>ESPECIALISTA {idx+1}</span>
                {idx > 0 && <button onClick={() => setSpecs(s => s.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 13 }}>✕ Quitar</button>}
              </div>
              <Field value={sp.name} onChange={v => updSpec(idx, 'name', v)} placeholder='Nombre completo' />
              <Sel value={sp.role} onChange={v => roleChange(idx, v)} options={SPECIALIST_ROLES} />
              <Field value={sp.acred} onChange={v => updSpec(idx, 'acred', v)} placeholder='Acreditación / especialidad detallada' />
              {sp.role && sp.sections.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>Secciones asignadas:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {sp.sections.map(s => <Badge key={s} color='blue'>{SECTION_LABELS[s]?.split('(')[0].trim()}</Badge>)}
                  </div>
                </div>
              )}
            </div>
          ))}
          <button onClick={() => setSpecs(s => [...s, { id: Date.now(), name: '', role: '', acred: '', sections: [] }])}
            style={{ background: 'none', border: `1px dashed ${C.border}`, borderRadius: 8,
              padding: '8px 16px', color: C.textMuted, cursor: 'pointer', fontSize: 12, width: '100%', marginBottom: 16 }}>
            + Agregar otro especialista
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant='ghost' onClick={() => setStep(1)}>← Atrás</Btn>
            <Btn disabled={specs.some(s => !s.name || !s.role)} onClick={() => setStep(3)}>Siguiente →</Btn>
          </div>
        </>}

        {step === 3 && <>
          <div style={{ color: C.text, fontWeight: 600, marginBottom: 16 }}>Confirmar y Crear</div>
          <div style={{ background: C.surfaceHigh, borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ color: C.accent, fontWeight: 700, fontSize: 15, marginBottom: 10 }}>📋 {pat.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['Nacimiento', pat.dob], ['Evaluación', pat.evalDate], ['Residencia', pat.residence], ['Escolaridad', pat.escolaridad]].map(([k, v]) => (
                <div key={k}><span style={{ color: C.textMuted, fontSize: 11 }}>{k}: </span><span style={{ color: C.text, fontSize: 12 }}>{v}</span></div>
              ))}
            </div>
          </div>
          <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 10, fontWeight: 600 }}>EQUIPO ({specs.length})</div>
          {specs.map(sp => (
            <div key={sp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: C.text, fontSize: 13 }}>{sp.name}</span>
              <Badge color='blue'>{sp.role}</Badge>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <Btn variant='ghost' onClick={() => setStep(2)}>← Atrás</Btn>
            <Btn variant='success' onClick={create}>✓ Crear Caso</Btn>
          </div>
        </>}
      </Card>
    </div>
  )
}

// ── VISTA: Detalle del Caso ───────────────────────────────────────────
function CaseDetail({ caseId, cases, setCases, user, onBack }) {
  const [tab, setTab]           = useState('estado')
  const [generating, setGen]    = useState(false)
  const [downloading, setDl]    = useState(false)
  const [preview, setPreview]   = useState(null)

  const caseData = cases[caseId]
  if (!caseData) return null

  const specs   = caseData.specialists || []
  const allDone = specs.length > 0 && specs.every(s => caseData.sections?.[s.id]?.submitted)

  const generateReport = async () => {
    setGen(true)
    try {
      const data = await apiCall('generate_report', { caseData })
      if (data.error) throw new Error(data.error)
      const updated = { ...cases, [caseId]: { ...caseData, reportJson: data.report, status: 'aprobado', approvedBy: user.name, approvedAt: new Date().toLocaleDateString('es-PE') } }
      setCases(updated); saveCases(updated); setTab('informe')
    } catch (e) { alert('Error: ' + e.message) }
    setGen(false)
  }

  const downloadDocx = async () => {
    setDl(true)
    try {
      const data = await apiCall('generate_docx', { report: caseData.reportJson, caseData })
      if (data.error) throw new Error(data.error)
      const bytes = Uint8Array.from(atob(data.docxBase64), c => c.charCodeAt(0))
      const blob  = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      const url   = URL.createObjectURL(blob)
      const a     = document.createElement('a'); a.href = url; a.download = data.filename; a.click()
    } catch (e) { alert('Error al descargar: ' + e.message) }
    setDl(false)
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 20 }}>←</button>
        <div>
          <h2 style={{ color: C.text, margin: 0, fontSize: 20 }}>{caseData.patientName}</h2>
          <div style={{ color: C.textMuted, fontSize: 12 }}>{caseId} · Creado por {caseData.createdBy} · {caseData.createdAt}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: C.surfaceHigh, borderRadius: 10, padding: 4 }}>
        {[['estado','📊 Estado'], ['secciones','📝 Secciones'], ['informe','📄 Informe']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, background: tab === t ? C.surface : 'transparent',
            border: tab === t ? `1px solid ${C.border}` : '1px solid transparent', borderRadius: 8,
            padding: '8px', color: tab === t ? C.text : C.textMuted, cursor: 'pointer',
            fontSize: 13, fontFamily: 'inherit', fontWeight: tab === t ? 600 : 400 }}>{l}</button>
        ))}
      </div>

      {/* Tab: Estado */}
      {tab === 'estado' && <>
        <Card style={{ marginBottom: 16 }}>
          <div style={{ color: C.text, fontWeight: 600, marginBottom: 12 }}>🔑 Código para especialistas</div>
          <div style={{ background: C.bg, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <code style={{ color: C.accent, fontSize: 22, letterSpacing: '0.12em', fontWeight: 800 }}>{caseId}</code>
            <button onClick={() => { navigator.clipboard?.writeText(caseId); alert('¡Código copiado!') }}
              style={{ background: C.accentSoft, border: `1px solid ${C.accent}`, borderRadius: 7, padding: '6px 14px', color: C.accent, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              Copiar
            </button>
          </div>
          <div style={{ color: C.textMuted, fontSize: 12, marginTop: 8 }}>
            📱 Manda este código por WhatsApp a cada especialista junto con la URL de la app.
          </div>
        </Card>

        <Card>
          <div style={{ color: C.text, fontWeight: 600, marginBottom: 14 }}>Estado del equipo</div>
          {specs.map(sp => {
            const done = caseData.sections?.[sp.id]?.submitted
            return (
              <div key={sp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>{sp.name}</div>
                  <div style={{ color: C.textMuted, fontSize: 11 }}>{sp.role}</div>
                </div>
                <Badge color={done ? 'green' : 'amber'}>{done ? '✓ Enviado' : '⏳ Pendiente'}</Badge>
              </div>
            )
          })}
          {allDone && caseData.status !== 'aprobado' && (
            <div style={{ marginTop: 16 }}>
              <div style={{ background: C.greenSoft, border: `1px solid #0D4A2A`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ color: C.green, fontWeight: 600, marginBottom: 4 }}>✅ Todas las secciones recibidas</div>
                <div style={{ color: C.textMuted, fontSize: 12 }}>Ya puedes generar el informe final integrado.</div>
              </div>
              <Btn variant='success' onClick={generateReport} disabled={generating}>
                {generating ? '⏳ Claude está integrando el informe...' : '✨ Generar Informe Final'}
              </Btn>
            </div>
          )}
        </Card>
      </>}

      {/* Tab: Secciones */}
      {tab === 'secciones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {specs.map(sp => {
            const sec = caseData.sections?.[sp.id]
            return (
              <Card key={sp.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ color: C.text, fontWeight: 600 }}>{sp.name}</div>
                    <div style={{ color: C.textMuted, fontSize: 12 }}>{sp.role}</div>
                  </div>
                  <Badge color={sec?.submitted ? 'green' : 'gray'}>{sec?.submitted ? '✓ Enviado' : 'Pendiente'}</Badge>
                </div>
                {sec?.submitted && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ background: C.bg, borderRadius: 8, padding: 12, maxHeight: 100, overflow: 'hidden', position: 'relative' }}>
                      <pre style={{ color: C.textMuted, fontSize: 12, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                        {sec.content?.substring(0, 250)}...
                      </pre>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 36, background: `linear-gradient(transparent, ${C.bg})` }} />
                    </div>
                    <button onClick={() => setPreview(sp.id)} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 12, marginTop: 6, padding: 0 }}>
                      Ver completo →
                    </button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Tab: Informe */}
      {tab === 'informe' && (
        caseData.reportJson ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Badge color='green'>✓ Informe listo</Badge>
              <Btn variant='success' onClick={downloadDocx} disabled={downloading}>
                {downloading ? '⏳ Generando .docx...' : '⬇ Descargar Word (.docx)'}
              </Btn>
            </div>
            <ReportPreview report={caseData.reportJson} patientName={caseData.patientName} />
          </div>
        ) : (
          <Card style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            <div style={{ color: C.textMuted, marginBottom: 16 }}>El informe se genera cuando todos los especialistas completen su parte.</div>
            {allDone && <Btn onClick={generateReport} disabled={generating}>{generating ? 'Generando...' : 'Generar Ahora'}</Btn>}
          </Card>
        )
      )}

      {/* Modal: ver sección completa */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, maxWidth: 620, width: '100%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ color: C.text, fontWeight: 600 }}>{specs.find(s => s.id === preview)?.name}</div>
              <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 22 }}>✕</button>
            </div>
            <pre style={{ color: C.text, fontSize: 13, whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.7 }}>
              {caseData.sections?.[preview]?.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

// ── VISTA: Especialista ───────────────────────────────────────────────
function SpecialistView({ user, cases, setCases }) {
  const caseData   = cases[user.code]
  const specialist = caseData?.specialists?.find(s =>
    s.name.trim().toLowerCase() === user.name.trim().toLowerCase()
  )
  const existingContent = caseData?.sections?.[specialist?.id]?.content || ''
  const [content, setContent]   = useState(existingContent)
  const [submitted, setSubm]    = useState(caseData?.sections?.[specialist?.id]?.submitted || false)
  const [aiText, setAiText]     = useState('')
  const [aiLoading, setAiLoad]  = useState(false)

  if (!caseData) return (
    <Card style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
      <div style={{ color: C.text, fontWeight: 600, marginBottom: 8 }}>Caso no encontrado</div>
      <div style={{ color: C.textMuted, fontSize: 13 }}>El código <strong style={{ color: C.accent }}>{user.code}</strong> no existe. Verifica con tu coordinador.</div>
    </Card>
  )

  if (!specialist) return (
    <Card style={{ maxWidth: 480, margin: '60px auto' }}>
      <div style={{ color: C.amber, fontWeight: 600, marginBottom: 8 }}>⚠ Tu nombre no coincide</div>
      <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 12 }}>Escribe tu nombre exactamente como fue registrado por el coordinador.</div>
      <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 8 }}>Nombres en este caso:</div>
      {caseData.specialists?.map(s => <div key={s.id} style={{ color: C.text, fontSize: 13, padding: '4px 0' }}>• {s.name}</div>)}
    </Card>
  )

  const askAI = async () => {
    if (!aiText.trim()) return
    setAiLoad(true)
    try {
      const data = await apiCall('ai_assist', {
        systemPrompt: `Eres un asistente experto en redacción de informes clínicos diagnósticos de salud mental y neuropsicología. Ayudas a especialistas a redactar sus secciones de forma profesional, clara y clínicamente precisa. Responde en español.`,
        userPrompt: `Soy ${user.name}, ${user.role}. Estoy redactando la sección de: ${specialist.sections?.map(s => SECTION_LABELS[s]).join(', ')} del informe del paciente ${caseData.patientName}.

Mis notas/hallazgos: ${aiText}

${content ? `Lo que llevo escrito:\n${content}` : ''}

Redacta o mejora esta sección de manera profesional para el informe diagnóstico.`,
      })
      setContent(prev => prev ? prev + '\n\n' + data.text : data.text)
      setAiText('')
    } catch (e) { alert('Error: ' + e.message) }
    setAiLoad(false)
  }

  const submit = async () => {
    if (!content.trim()) return
    const sections = { ...(caseData.sections || {}), [specialist.id]: { content, submitted: true, submittedAt: new Date().toLocaleDateString('es-PE') } }
    const updated  = { ...cases, [user.code]: { ...caseData, sections } }
    setCases(updated); saveCases(updated); setSubm(true)
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Info del caso */}
      <Card style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{caseData.patientName}</div>
            <div style={{ color: C.textMuted, fontSize: 12 }}>{user.code} · Evaluación: {caseData.evaluationDate}</div>
          </div>
          <Badge color={submitted ? 'green' : 'amber'}>{submitted ? '✓ Enviado' : 'Pendiente'}</Badge>
        </div>
      </Card>

      {/* Rol y secciones */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ color: C.accent, fontWeight: 600, fontSize: 14 }}>{user.role}</div>
        <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2, marginBottom: 10 }}>{user.name}</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>Tus secciones asignadas:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {specialist.sections?.map(s => <Badge key={s} color='blue'>{SECTION_LABELS[s]?.split('(')[0].trim()}</Badge>)}
        </div>
      </Card>

      {submitted ? (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ color: C.green, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>¡Sección enviada!</div>
          <div style={{ color: C.textMuted, fontSize: 13 }}>El coordinador recibirá tu aporte. Muchas gracias.</div>
          <div style={{ background: C.bg, borderRadius: 10, padding: 14, marginTop: 20, maxHeight: 200, overflow: 'auto', textAlign: 'left' }}>
            <pre style={{ color: C.textMuted, fontSize: 12, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{content}</pre>
          </div>
        </Card>
      ) : (
        <>
          {/* Asistente IA */}
          <Card style={{ marginBottom: 16, background: '#111A2E', borderColor: '#1E3A6E' }}>
            <div style={{ color: C.accent, fontWeight: 700, marginBottom: 6, fontSize: 14 }}>✨ Asistente IA</div>
            <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 12 }}>
              Describe tus hallazgos en tus propias palabras y Claude los redacta de forma clínica y profesional.
            </div>
            <Field value={aiText} onChange={setAiText} rows={4}
              placeholder={`Ej: "El paciente obtuvo 34/40 en auditivo, se sorprende con ruidos inesperados, usa audífonos para bloquear el ambiente..."`} />
            <Btn onClick={askAI} disabled={aiLoading || !aiText.trim()} small>
              {aiLoading ? '⏳ Redactando...' : '✨ Redactar con IA'}
            </Btn>
          </Card>

          {/* Editor */}
          <Card>
            <Field label='Tu sección del informe' value={content} onChange={setContent} rows={14}
              placeholder='Aquí aparecerá el texto redactado por IA. Puedes editarlo libremente antes de enviar.' />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Btn variant='success' disabled={!content.trim()} onClick={submit}>✓ Enviar sección</Btn>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

// ── Preview del informe ───────────────────────────────────────────────
function ReportPreview({ report, patientName }) {
  const STitle = ({ t }) => (
    <div style={{ color: C.accent, fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, marginTop: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>{t}</div>
  )
  return (
    <Card style={{ lineHeight: 1.8 }}>
      <div style={{ borderBottom: `2px solid ${C.accent}`, paddingBottom: 16, marginBottom: 20, textAlign: 'center' }}>
        <div style={{ color: C.accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Informe de Evaluación Diagnóstica</div>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 20 }}>{patientName}</div>
      </div>
      <STitle t='Datos Generales' />
      <p style={{ color: C.text, fontSize: 13, whiteSpace: 'pre-wrap' }}>{report.datosGenerales}</p>
      <STitle t='Motivo de Evaluación' />
      <p style={{ color: C.text, fontSize: 13, whiteSpace: 'pre-wrap' }}>{report.motivacion}</p>
      {report.instrumentos?.length > 0 && <>
        <STitle t='Instrumentos Aplicados' />
        {report.instrumentos.map((i, idx) => <div key={idx} style={{ color: C.text, fontSize: 13, padding: '2px 0 2px 14px', borderLeft: `2px solid ${C.border}`, marginBottom: 4 }}>{i}</div>)}
      </>}
      {report.secciones?.map((s, idx) => (
        <div key={idx}>
          <STitle t={s.titulo} />
          <p style={{ color: C.text, fontSize: 13, whiteSpace: 'pre-wrap' }}>{s.contenido}</p>
        </div>
      ))}
      <STitle t='Conclusión Diagnóstica' />
      <div style={{ background: C.accentSoft, border: `1px solid #1E3A6E`, borderRadius: 8, padding: 14 }}>
        <p style={{ color: C.text, fontSize: 13, whiteSpace: 'pre-wrap', margin: 0 }}>{report.conclusion}</p>
      </div>
      {report.derivaciones && <>
        <STitle t='Derivaciones y Sugerencias' />
        {[['Contexto Familiar', report.derivaciones.familiar], ['Contexto Clínico', report.derivaciones.clinico], ['Contexto Universitario', report.derivaciones.universitario]].filter(([,v]) => v).map(([k, v]) => (
          <div key={k} style={{ marginBottom: 14 }}>
            <div style={{ color: C.amber, fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{k}</div>
            <p style={{ color: C.text, fontSize: 13, whiteSpace: 'pre-wrap', margin: 0 }}>{v}</p>
          </div>
        ))}
      </>}
      {report.especialistas?.length > 0 && <>
        <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 24, paddingTop: 16 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {report.especialistas.map((e, i) => (
              <div key={i} style={{ minWidth: 160 }}>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{e.nombre}</div>
                  <div style={{ color: C.textMuted, fontSize: 11 }}>{e.especialidad}</div>
                  {e.acreditacion && <div style={{ color: C.textDim, fontSize: 10, fontStyle: 'italic' }}>{e.acreditacion}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </>}
    </Card>
  )
}

// ── App ───────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]   = useState(null)
  const [cases, setCases] = useState({})

  useEffect(() => { setCases(loadCases()) }, [])

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", color: C.text }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '0 24px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.surface, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🧠</span>
          <span style={{ color: C.text, fontWeight: 800, fontSize: 16 }}>InformaDX</span>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: C.textMuted, fontSize: 12 }}>{user.name}</span>
            <Badge color={user.mode === 'coordinador' ? 'blue' : 'amber'}>
              {user.mode === 'coordinador' ? 'Coordinador' : user.role}
            </Badge>
            <button onClick={() => setUser(null)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', color: C.textMuted, cursor: 'pointer', fontSize: 11 }}>Salir</button>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div style={{ padding: '32px 24px' }}>
        {!user
          ? <HomeView onEnter={setUser} />
          : user.mode === 'coordinador'
            ? <CoordinatorDash user={user} cases={cases} setCases={setCases} />
            : <SpecialistView  user={user} cases={cases} setCases={setCases} />
        }
      </div>
    </div>
  )
}
