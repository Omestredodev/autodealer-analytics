import { useState } from 'react'
import { LiveModule } from './live/LiveModule'
import { LiveDashboard } from './live/LiveDashboard'
import { LiveCatalog, LiveVehicleDetail } from './live/LiveCatalog'

type IconName =
  | 'grid' | 'car' | 'users' | 'calendar' | 'sale' | 'audit' | 'chart'
  | 'lab' | 'server' | 'shield' | 'search' | 'bell' | 'chevron' | 'plus'
  | 'arrow' | 'clock' | 'menu' | 'x'

const paths: Record<IconName, React.ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  car: <><path d="M5 17h14l-1.2-5.2A2 2 0 0 0 15.85 10h-7.7a2 2 0 0 0-1.95 1.55L5 17Z"/><path d="M3 17h18v3H3z"/><circle cx="7" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  sale: <><path d="M20 12V5H3v14h9"/><path d="M3 9h17M7 15h2M16 19h6M19 16v6"/></>,
  audit: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
  chart: <><path d="M3 3v18h18"/><path d="m7 16 4-5 3 3 5-7"/></>,
  lab: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.75 3h10.5A2 2 0 0 0 19 18l-5-9V3"/><path d="M7.5 16h9"/></>,
  server: <><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  x: <><path d="m6 6 12 12M18 6 6 18"/></>,
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

const navigation: { section?: string; name: string; icon: IconName }[] = [
  { name: 'Visão geral', icon: 'grid' },
  { section: 'COMERCIAL', name: 'Veículos', icon: 'car' },
  { name: 'Anúncios', icon: 'chart' },
  { name: 'Cadastro de veículo', icon: 'plus' },
  { name: 'Leads', icon: 'users' },
  { name: 'Agendamentos', icon: 'calendar' },
  { name: 'Vendas', icon: 'sale' },
  { section: 'INTELIGÊNCIA', name: 'Auditoria', icon: 'audit' },
  { name: 'Analytics', icon: 'chart' },
  { name: 'Laboratório de tuning', icon: 'lab' },
  { name: 'Disponibilidade e CAP', icon: 'server' },
  { section: 'CONFIGURAÇÕES', name: 'Usuários e permissões', icon: 'shield' },
]

const metrics = [
  { label: 'Veículos disponíveis', value: '124', detail: '+8 este mês', tone: 'success', icon: 'car' as IconName },
  { label: 'Veículos reservados', value: '18', detail: '6 aguardam retorno', tone: 'warning', icon: 'clock' as IconName },
  { label: 'Vendas no período', value: 'R$ 1,82 mi', detail: '+12,4% vs. mês anterior', tone: 'success', icon: 'sale' as IconName },
  { label: 'Solicitações pendentes', value: '26', detail: '9 com alta prioridade', tone: 'info', icon: 'users' as IconName },
]

const cars = [
  { name: 'Jeep Compass Longitude', views: '1.284', price: 'R$ 159.900,00', image: 'https://images.unsplash.com/photo-1611168935847-4bf3f7291cde?auto=format&fit=crop&w=240&q=80' },
  { name: 'Porsche 718 Cayman', views: '986', price: 'R$ 599.900,00', image: 'https://images.unsplash.com/photo-1763165561886-a9391b2132c1?auto=format&fit=crop&w=240&q=80' },
  { name: 'BMW X6 M Sport', views: '742', price: 'R$ 689.900,00', image: 'https://images.unsplash.com/photo-1763165562062-91d744691c65?auto=format&fit=crop&w=240&q=80' },
]

function AdminApp({ onCustomer, onFlows, initialActive = 'Visão geral' }: { onCustomer: (page?:ClientPage) => void; onFlows: () => void; initialActive?: string }) {
  const [active, setActive] = useState(initialActive)
  const [drawer, setDrawer] = useState(false)

  return (
    <div className="app-shell">
      <aside className={`sidebar ${drawer ? 'sidebar-open' : ''}`}>
        <div className="brand"><span className="brand-mark"><Icon name="car" size={23}/></span><span>AutoDealer<small>ANALYTICS</small></span></div>
        <button className="close-drawer" onClick={() => setDrawer(false)} aria-label="Fechar menu"><Icon name="x"/></button>
        <nav aria-label="Navegação principal">
          {navigation.map((item) => (
            <div key={item.name}>
              {item.section && <p className="nav-section">{item.section}</p>}
              <button className={`nav-item ${active === item.name ? 'active' : ''}`} onClick={() => { setActive(item.name); setDrawer(false) }}>
                <Icon name={item.icon}/><span>{item.name}</span>
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button className="view-site" onClick={onFlows}>Ver diagramas de fluxo <Icon name="chart" size={15}/></button>

          <button
            className="view-site"
            onClick={() => onCustomer()}
          >
            Ver site da concessionária
            <Icon name="arrow" size={15} />
          </button>

          <div className="system-line"><span className="live-dot"/> Ambiente de demonstração</div>
          <p>Ambiente demonstrativo</p>
        </div>
      </aside>
      {drawer && <button className="scrim" onClick={() => setDrawer(false)} aria-label="Fechar menu"/>}

      <div className="main-area">
        <header className="topbar">
          <button className="menu-button" onClick={() => setDrawer(true)} aria-label="Abrir menu"><Icon name="menu"/></button>
          <div className="search"><Icon name="search" size={18}/><input aria-label="Pesquisar" placeholder="Pesquisar veículos, clientes..." /><kbd>⌘ K</kbd></div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notificações"><Icon name="bell"/><span className="notification"/></button>
            <div className="divider"/>
            <button className="profile"><span className="avatar">MS</span><span><strong>Ambiente local</strong><small>Sem autenticação</small></span><Icon name="chevron" size={15}/></button>
          </div>
        </header>

        <main>
          <div className="page-head">
            <div><p className="eyebrow">PAINEL ADMINISTRATIVO</p><h1>{active === 'Visão geral' ? 'Visão geral da plataforma' : active}</h1><p>{active === 'Visão geral' ? 'Dados reais consultados nos três bancos.' : ['Veículos','Anúncios','Leads','Agendamentos','Vendas','Auditoria'].includes(active) ? 'Consulta integrada à API local.' : 'Módulo ilustrativo do Figma; dados de demonstração.'}</p></div>
            {!['Visão geral','Veículos','Anúncios','Leads','Agendamentos','Vendas','Auditoria'].includes(active) && !active.includes('Anúncio') && <button className="primary-button" onClick={()=>setActive('Cadastro de veículo')}><Icon name="plus" size={18}/> Cadastrar veículo</button>}
          </div>

          {active !== 'Visão geral' && (
            ['Veículos','Anúncios','Leads','Agendamentos','Vendas','Auditoria'].includes(active)
              ? <LiveModule name={active}/>
              : <AdminModule active={active} navigate={setActive} openPublic={onCustomer}/>
          )}

          {active === 'Visão geral' && <LiveDashboard/>}
        </main>
      </div>
    </div>
  )
}

const vehicleRows = [
  ['AD-0248','Jeep Compass Longitude','2024','8.200 km','R$ 159.900,00','Disponível'],
  ['AD-0247','BMW X6 M Sport','2023','12.400 km','R$ 689.900,00','Reservado'],
  ['AD-0246','Porsche 718 Cayman','2024','3.100 km','R$ 599.900,00','Disponível'],
  ['AD-0245','Audi Q5 Performance','2023','18.700 km','R$ 319.900,00','Vendido'],
]

const adRows = [
  { id:'AN-1084', title:'Jeep Compass Longitude 2024 — baixa quilometragem', vehicle:'Jeep Compass Longitude', brand:'Jeep', price:'R$ 159.900,00', value:159900, status:'Publicado', updated:'24/10/2025, 14:32', views:'1.284', image:'https://images.unsplash.com/photo-1611168935847-4bf3f7291cde?auto=format&fit=crop&w=240&q=80' },
  { id:'AN-1083', title:'BMW X6 M Sport — performance e exclusividade', vehicle:'BMW X6 M Sport', brand:'BMW', price:'R$ 689.900,00', value:689900, status:'Rascunho', updated:'24/10/2025, 10:08', views:'—', image:'https://images.unsplash.com/photo-1763165562062-91d744691c65?auto=format&fit=crop&w=240&q=80' },
  { id:'AN-1082', title:'Porsche 718 Cayman 2024 — pronta entrega', vehicle:'Porsche 718 Cayman', brand:'Porsche', price:'R$ 599.900,00', value:599900, status:'Pausado', updated:'23/10/2025, 17:45', views:'986', image:'https://images.unsplash.com/photo-1763165561886-a9391b2132c1?auto=format&fit=crop&w=240&q=80' },
  { id:'AN-1081', title:'Audi Q5 Performance — conforto premium', vehicle:'Audi Q5 Performance', brand:'Audi', price:'R$ 319.900,00', value:319900, status:'Encerrado', updated:'22/10/2025, 09:12', views:'742', image:'https://images.unsplash.com/photo-1763596554361-38b21e76e666?auto=format&fit=crop&w=240&q=80' },
  { id:'AN-1080', title:'Volvo XC60 Plus 2024 — segurança e sofisticação', vehicle:'Volvo XC60 Plus', brand:'Volvo', price:'R$ 389.900,00', value:389900, status:'Publicado', updated:'21/10/2025, 16:20', views:'584', image:'https://images.unsplash.com/photo-1791656184137-4a0523f7349f?auto=format&fit=crop&w=240&q=80' },
]

function AdminModule({ active, navigate, openPublic }: { active: string; navigate: (name: string) => void; openPublic: (page?:ClientPage) => void }) {
  const [notice, setNotice] = useState('')
  const [running, setRunning] = useState(false)
  const [adQuery, setAdQuery] = useState('')
  const [adStatus, setAdStatus] = useState('Todos')
  const [adBrand, setAdBrand] = useState('Todas')
  const [adPrice, setAdPrice] = useState('Todos')
  const [emptyAds, setEmptyAds] = useState(false)
  const [adModal, setAdModal] = useState<{ action:string; title:string; id?:string } | null>(null)
  const [adExitModal, setAdExitModal] = useState(false)
  const [adPreview, setAdPreview] = useState(false)
  const [adTitle, setAdTitle] = useState('')
  const [adDescription, setAdDescription] = useState('')
  const [adPriceValue, setAdPriceValue] = useState('')
  const [adPromoValue, setAdPromoValue] = useState('')
  const [adValidated, setAdValidated] = useState(false)
  const [adFeatured, setAdFeatured] = useState(true)
  const [adVisible, setAdVisible] = useState(true)
  const [adImages, setAdImages] = useState(clientCars.slice(0,4).map((car,index)=>({ src:car.image, cover:index===0 })))
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null)
  const [adStatusOverrides, setAdStatusOverrides] = useState<Record<string,string>>({})
  const [previewViewport, setPreviewViewport] = useState<'desktop'|'mobile'>('desktop')
  const [publishError, setPublishError] = useState('')
  const act = (message: string) => { setNotice(message); window.setTimeout(()=>setNotice(''), 2600) }
  const frameNames: Record<string,string> = {
    'Veículos':'A02 — Gestão de Veículos — Responsivo',
    'Anúncios':'A02.1 — Gestão de Anúncios — Responsivo',
    'Criar anúncio':'A02.2 — Criar Anúncio — Responsivo',
    'Editar anúncio':'A02.3 — Editar Anúncio — Responsivo',
    'Cadastro de veículo':'A03 — Cadastro de Veículo — Responsivo',
    'Clientes':'A04 — Clientes — Responsivo',
    'Agendamentos':'A05 — Agendamentos — Responsivo',
    'Vendas':'A06 — Vendas — Responsivo',
    'Auditoria':'A07 — Auditoria — Responsivo',
    'Analytics':'A08 — Analytics — Responsivo',
    'Laboratório de tuning':'A09 — Laboratório de Tuning — Responsivo',
    'Disponibilidade e CAP':'A10 — Disponibilidade e CAP — Responsivo',
    'Usuários e permissões':'A11 — Usuários e Permissões — Responsivo',
  }

  const shell = (content: React.ReactNode) => <section className="admin-module" data-frame={frameNames[active]}>
    {notice && <div className="admin-toast"><Icon name="shield" size={17}/>{notice}</div>}
    {content}
  </section>

  if (active === 'Criar anúncio' || active === 'Editar anúncio') {
    const editing = active === 'Editar anúncio'
    const selectedAd = adRows.find(ad=>ad.id===selectedAdId)
    const currentStatus = selectedAd ? (adStatusOverrides[selectedAd.id] || selectedAd.status) : 'Rascunho'
    const invalid = adValidated && (!adTitle.trim() || !adDescription.trim() || !adPriceValue.trim())
    const publicationInvalid = !adTitle.trim() || !adDescription.trim() || !adPriceValue.trim() || !adImages.some(image=>image.cover)
    const saveAd = (draft = false) => {
      setAdValidated(true)
      if (!draft && (!adTitle.trim() || !adDescription.trim() || !adPriceValue.trim())) return
      act(draft ? 'Rascunho demonstrativo salvo com sucesso.' : 'Anúncio demonstrativo salvo com sucesso.')
      navigate('Anúncios')
    }
    const requestStatus = (action:string) => {
      if(action==='Publicar' && publicationInvalid){
        setAdValidated(true)
        setPublishError('A publicação exige veículo relacionado, título, descrição, preço e foto de capa.')
        return
      }
      setPublishError('')
      setAdModal({action,title:adTitle||selectedAd?.title||'Anúncio sem título',id:selectedAdId||undefined})
    }
    const confirmStatus = () => {
      if(!adModal) return
      const nextStatus:Record<string,string>={Publicar:'Publicado',Pausar:'Pausado',Reativar:'Publicado',Encerrar:'Encerrado',Arquivar:'Arquivado','Enviar para revisão':'Em revisão'}
      if(adModal.id) setAdStatusOverrides(current=>({...current,[adModal.id!]:nextStatus[adModal.action]}))
      act(`Anúncio atualizado para “${nextStatus[adModal.action]}” com sucesso.`)
      setAdModal(null)
      navigate('Anúncios')
    }
    const removeImage = (index:number) => setAdImages(images => images.filter((_,i)=>i!==index).map((image,i)=>({...image,cover:i===0?true:image.cover})))
    const makeCover = (index:number) => setAdImages(images => images.map((image,i)=>({...image,cover:i===index})))
    const moveImage = (index:number, direction:-1|1) => setAdImages(images => {
      const target=index+direction
      if(target<0||target>=images.length) return images
      const next=[...images];[next[index],next[target]]=[next[target],next[index]]
      return next
    })
    return shell(<>
      <div className="ad-create-head"><button onClick={()=>setAdExitModal(true)}>← Voltar para anúncios</button><div><span>● Alterações não salvas</span><strong>{editing?'Editar anúncio':'Novo anúncio'}</strong><small>{editing?`${selectedAd?.id || 'AN-1084'} • Última atualização: ${selectedAd?.updated || '24/10/2025, 14:32'}`:'Associe um veículo existente e defina apenas as informações comerciais.'}</small></div>{editing&&<div className="edit-status"><small>Status atual</small><Status text={currentStatus}/></div>}</div>
      {publishError&&<div className="form-error-banner"><Icon name="x" size={18}/><div><strong>O anúncio ainda não pode ser publicado</strong><span>{publishError}</span></div></div>}
      {invalid&&<div className="form-error-banner"><Icon name="x" size={18}/><div><strong>Revise os campos obrigatórios</strong><span>Preencha título, descrição comercial e preço anunciado antes de salvar.</span></div></div>}
      <div className="ad-create-layout"><div className="ad-create-stack">
        <FormSection title="1. Veículo relacionado" subtitle="Selecione um veículo já cadastrado. Os dados técnicos são somente leitura."><label className="admin-field">Veículo cadastrado<select className="ad-select"><option>AD-0248 — Jeep Compass Longitude 2024</option><option>AD-0247 — BMW X6 M Sport 2023</option><option>AD-0246 — Porsche 718 Cayman 2024</option></select></label><div className="linked-vehicle"><img src={clientCars[0].image} alt="Jeep Compass relacionado"/><div><span>VEÍCULO SELECIONADO</span><strong>Jeep Compass Longitude TD350</strong><small>2024/2024 • 8.200 km • Diesel • Automático • Azul Jazz</small></div><Status text="Disponível"/></div><p className="readonly-note"><Icon name="shield" size={14}/> Dados técnicos são gerenciados em Veículos e não podem ser alterados neste anúncio.</p></FormSection>
        <FormSection title="2. Conteúdo comercial" subtitle="Crie uma apresentação clara e atrativa para o consumidor."><div className="ad-content-fields"><label className={`admin-field ${adValidated&&!adTitle.trim()?'field-error':''}`}>Título do anúncio *<input value={adTitle} maxLength={80} onChange={e=>setAdTitle(e.target.value)} placeholder="Ex.: Jeep Compass Longitude 2024 — baixa quilometragem"/><small>{adTitle.length}/80 caracteres</small></label><label className={`admin-field ${adValidated&&!adDescription.trim()?'field-error':''}`}>Descrição comercial *<textarea value={adDescription} onChange={e=>setAdDescription(e.target.value)} placeholder="Destaque o estado de conservação, procedência e experiência oferecida..."/><small>{adDescription.length}/600 caracteres</small></label><label className="admin-field">Diferenciais<input placeholder="Ex.: Único dono, revisões em concessionária, baixa quilometragem"/></label></div></FormSection>
        <FormSection title="3. Galeria de imagens" subtitle="Defina a capa, ordene ou remova imagens apenas visualmente nesta demonstração."><div className="ad-gallery">{adImages.map((image,index)=><div className={image.cover?'ad-gallery-item cover':''} key={image.src}><img src={image.src} alt={`Imagem demonstrativa ${index+1}`}/>{image.cover&&<span>Foto de capa</span>}<div><button disabled={index===0} onClick={()=>moveImage(index,-1)}>←</button><button disabled={index===adImages.length-1} onClick={()=>moveImage(index,1)}>→</button><button onClick={()=>makeCover(index)}>Capa</button><button className="remove" onClick={()=>removeImage(index)}>Remover</button></div></div>)}<button className="ad-upload" onClick={()=>act('Uploads não são persistidos nesta demonstração.')}><Icon name="plus"/><strong>Adicionar imagem</strong><small>Representação visual — sem upload real</small></button></div></FormSection>
        <FormSection title="4. Preço do anúncio" subtitle="O preço técnico do veículo não será alterado."><div className="admin-form-grid"><label className={`admin-field ${adValidated&&!adPriceValue.trim()?'field-error':''}`}>Preço anunciado *<input value={adPriceValue} onChange={e=>setAdPriceValue(e.target.value)} placeholder="R$ 159.900,00"/></label><label className="admin-field">Preço promocional opcional<input value={adPromoValue} onChange={e=>setAdPromoValue(e.target.value)} placeholder="R$ 154.900,00"/></label></div></FormSection>
        <FormSection title="5. Destaque e visibilidade" subtitle="Configure como o anúncio aparecerá no catálogo."><div className="ad-options"><button className={adFeatured?'selected':''} onClick={()=>setAdFeatured(!adFeatured)}><span className="fake-switch"/><div><strong>Destacar no catálogo</strong><small>Prioriza o anúncio nas áreas de destaque.</small></div></button><button className={adVisible?'selected':''} onClick={()=>setAdVisible(!adVisible)}><span className="fake-switch"/><div><strong>Visível no site</strong><small>Permite exibição após a publicação.</small></div></button></div></FormSection>
      </div><aside className="ad-create-summary"><span>PRÉVIA RESUMIDA</span><img src={adImages.find(image=>image.cover)?.src || clientCars[0].image}/><Status text="Rascunho"/><h3>{adTitle||'Título do anúncio'}</h3><p>{adDescription||'Sua descrição comercial será exibida aqui.'}</p>{adPromoValue&&<del>{adPriceValue}</del>}<strong>{adPromoValue||adPriceValue||'R$ 0,00'}</strong><small>Dados demonstrativos • sem persistência</small></aside></div>
      {editing&&<div className="ad-lifecycle"><div><strong>Ações do anúncio</strong><span>A revisão é opcional e só deve ser usada quando o fluxo interno estiver configurado.</span></div>{currentStatus==='Rascunho'&&<button onClick={()=>requestStatus('Enviar para revisão')}>Enviar para revisão</button>}{['Rascunho','Em revisão','Pausado'].includes(currentStatus)&&<button className="publish" onClick={()=>requestStatus(currentStatus==='Pausado'?'Reativar':'Publicar')}>{currentStatus==='Pausado'?'Reativar':'Publicar'}</button>}{currentStatus==='Publicado'&&<button onClick={()=>requestStatus('Pausar')}>Pausar</button>}{!['Encerrado','Arquivado'].includes(currentStatus)&&<button className="end" onClick={()=>requestStatus('Encerrar')}>Encerrar</button>}{currentStatus==='Encerrado'&&<button onClick={()=>requestStatus('Arquivar')}>Arquivar</button>}</div>}
      <div className="ad-form-actions"><button onClick={()=>setAdExitModal(true)}>Cancelar</button><button onClick={()=>saveAd(true)}>Salvar rascunho</button><button onClick={()=>setAdPreview(true)}>Pré-visualizar</button><button className="publish-save" onClick={()=>saveAd(false)}>Salvar alterações</button></div>
      {adExitModal&&<div className="modal-backdrop"><div className="confirm-modal" role="dialog" aria-modal="true"><span className="confirm-icon danger"><Icon name="x"/></span><h2>Sair sem salvar?</h2><p>As alterações feitas neste anúncio serão descartadas. Nenhum dado demonstrativo será mantido.</p><div><button onClick={()=>setAdExitModal(false)}>Continuar editando</button><button className="confirm-danger" onClick={()=>{setAdExitModal(false);navigate('Anúncios')}}>Descartar alterações</button></div></div></div>}
      {adPreview&&<div className="modal-backdrop"><div className="preview-shell"><div className="preview-toolbar"><div><button className={previewViewport==='desktop'?'active':''} onClick={()=>setPreviewViewport('desktop')}>Desktop</button><button className={previewViewport==='mobile'?'active':''} onClick={()=>setPreviewViewport('mobile')}>Mobile</button></div><span>{currentStatus!=='Publicado'?'Prévia administrativa — anúncio não publicado':'Visualização pública demonstrativa'}</span><div className="preview-links"><button onClick={()=>openPublic('detail')}>Abrir no catálogo público</button><button onClick={()=>setAdPreview(false)}>Fechar</button></div></div><div className={`ad-preview-modal ${previewViewport}`}><img src={adImages.find(image=>image.cover)?.src || clientCars[0].image}/><div><span>{currentStatus!=='Publicado'?'PRÉVIA ADMINISTRATIVA':'ANÚNCIO PUBLICADO'}</span><h2>{adTitle||'Título do anúncio ainda não informado'}</h2><p>{adDescription||'Adicione uma descrição comercial para visualizar o conteúdo do anúncio.'}</p>{adPromoValue&&<del>{adPriceValue}</del>}<strong>{adPromoValue||adPriceValue||'Preço não informado'}</strong><small>Jeep Compass Longitude • 2024 • 8.200 km</small></div></div></div></div>}
      {adModal&&<div className="modal-backdrop"><div className="confirm-modal" role="dialog" aria-modal="true"><span className={`confirm-icon ${['Encerrar','Arquivar'].includes(adModal.action)?'danger':''}`}><Icon name={['Encerrar','Arquivar'].includes(adModal.action)?'x':'shield'}/></span><h2>{adModal.action} anúncio?</h2><p>Confirme a alteração de status de “{adModal.title}”. Esta operação é demonstrativa e não persiste dados em backend.</p><div><button onClick={()=>setAdModal(null)}>Cancelar</button><button className={['Encerrar','Arquivar'].includes(adModal.action)?'confirm-danger':'confirm-primary'} onClick={confirmStatus}>Confirmar</button></div></div></div>}
    </>)
  }

  if (active === 'Anúncios') {
    const adsWithStatus = adRows.map(ad=>({...ad,status:adStatusOverrides[ad.id]||ad.status}))
    const filteredAds = emptyAds ? [] : adsWithStatus.filter(ad =>
      (ad.title.toLowerCase().includes(adQuery.toLowerCase()) || ad.vehicle.toLowerCase().includes(adQuery.toLowerCase())) &&
      (adStatus === 'Todos' || ad.status === adStatus) &&
      (adBrand === 'Todas' || ad.brand === adBrand) &&
      (adPrice === 'Todos' || (adPrice === 'Até R$ 300 mil' ? ad.value <= 300000 : ad.value > 300000))
    )
    const loadAd = (ad:typeof adRows[0]) => {
      setSelectedAdId(ad.id)
      setAdTitle(ad.title)
      setAdDescription('Veículo demonstrativo selecionado, com procedência verificada, excelente estado de conservação e experiência premium.')
      setAdPriceValue(ad.price)
      setAdPromoValue('')
      setAdValidated(false)
      setPublishError('')
      setAdImages(clientCars.slice(0,4).map((car,index)=>({src:index===0?ad.image:car.image,cover:index===0})))
    }
    const editAd = (ad:typeof adRows[0], preview=false) => { loadAd(ad); setAdPreview(preview); navigate('Editar anúncio') }
    const duplicateAd = (ad:typeof adRows[0]) => {
      loadAd(ad)
      setSelectedAdId(null)
      setAdTitle(`${ad.title} — cópia`)
      setAdStatusOverrides(current=>({...current,[`copy-${Date.now()}`]:'Rascunho'}))
      act('Novo rascunho criado sem métricas ou histórico do anúncio original.')
      navigate('Criar anúncio')
    }
    const importantAction = (action:string, title:string, id:string) => setAdModal({ action, title, id })
    const confirmListAction = () => {
      if(!adModal?.id) return
      const next:Record<string,string>={Publicar:'Publicado',Pausar:'Pausado',Reativar:'Publicado',Encerrar:'Encerrado',Arquivar:'Arquivado'}
      setAdStatusOverrides(current=>({...current,[adModal.id!]:next[adModal.action]}))
      act(`Anúncio atualizado para “${next[adModal.action]}” com sucesso.`)
      setAdModal(null)
    }
    return shell(<>
      <div className="ads-demo-note"><Icon name="chart" size={18}/><div><strong>Gestão demonstrativa de anúncios</strong><span>Todos os títulos, valores, visualizações e datas exibidos são fictícios.</span></div><button onClick={()=>setEmptyAds(!emptyAds)}>{emptyAds?'Voltar à listagem':'Visualizar estado vazio'}</button></div>
      <div className="ad-metrics"><MiniKpi label="Visualizações" value="3.596" change="Simulado"/><MiniKpi label="Favoritos" value="184" change="5,1%"/><MiniKpi label="Contatos" value="42" change="1,2%"/><MiniKpi label="Agendamentos" value="18" change="Demonstrativo"/><MiniKpi label="Conversões" value="4" change="Não automáticas"/></div>
      <div className="ads-toolbar"><div className="ads-search"><Icon name="search" size={17}/><input value={adQuery} onChange={e=>setAdQuery(e.target.value)} placeholder="Buscar por título ou veículo relacionado"/></div><button className="toolbar-primary" onClick={()=>navigate('Criar anúncio')}><Icon name="plus" size={16}/> Criar anúncio</button></div>
      <div className="ads-filters"><label>Status<select value={adStatus} onChange={e=>setAdStatus(e.target.value)}><option>Todos</option><option>Rascunho</option><option>Em revisão</option><option>Publicado</option><option>Pausado</option><option>Encerrado</option><option>Arquivado</option></select></label><label>Marca<select value={adBrand} onChange={e=>setAdBrand(e.target.value)}><option>Todas</option><option>Jeep</option><option>BMW</option><option>Porsche</option><option>Audi</option></select></label><label>Preço anunciado<select value={adPrice} onChange={e=>setAdPrice(e.target.value)}><option>Todos</option><option>Até R$ 300 mil</option><option>Acima de R$ 300 mil</option></select></label><button onClick={()=>{setAdQuery('');setAdStatus('Todos');setAdBrand('Todas');setAdPrice('Todos');setEmptyAds(false)}}>Limpar filtros</button></div>
      {filteredAds.length ? <><div className="admin-table ads-table"><div className="table-head"><span>Capa</span><span>Título do anúncio</span><span>Veículo relacionado</span><span>Preço anunciado</span><span>Status</span><span>Atualização</span><span>Visualizações</span><span>Ações</span></div>{filteredAds.map(ad=><div className="table-row" key={ad.id}><span><img className="ad-cover" src={ad.image} alt={`Capa demonstrativa de ${ad.vehicle}`}/></span><span className="ad-title"><strong>{ad.title}</strong><small>{ad.id}{ad.status!=='Publicado'?' • Prévia administrativa':''}</small></span><span>{ad.vehicle}</span><strong>{ad.price}</strong><span><Status text={ad.status}/></span><span>{ad.updated}</span><span className="ad-views"><Icon name="chart" size={14}/>{ad.views}</span><span className="ad-actions"><button onClick={()=>editAd(ad,true)}>Visualizar</button><button onClick={()=>editAd(ad)}>Editar</button><button onClick={()=>duplicateAd(ad)}>Duplicar</button>{['Rascunho','Em revisão'].includes(ad.status)&&<button onClick={()=>importantAction('Publicar',ad.title,ad.id)}>Publicar</button>}{ad.status==='Publicado'&&<button onClick={()=>importantAction('Pausar',ad.title,ad.id)}>Pausar</button>}{ad.status==='Pausado'&&<button onClick={()=>importantAction('Reativar',ad.title,ad.id)}>Reativar</button>}{!['Encerrado','Arquivado'].includes(ad.status)&&<button className="danger-link" onClick={()=>importantAction('Encerrar',ad.title,ad.id)}>Encerrar</button>}{ad.status==='Encerrado'&&<button onClick={()=>importantAction('Arquivar',ad.title,ad.id)}>Arquivar</button>}</span></div>)}</div><TableFooter/></> :
      <div className="ads-empty"><span><Icon name={emptyAds?'chart':'search'} size={30}/></span><h2>{emptyAds?'Nenhum anúncio criado':'Nenhum resultado encontrado'}</h2><p>{emptyAds?'Crie o primeiro anúncio para começar a divulgar os veículos do estoque.':'Revise os termos da busca ou remova alguns filtros.'}</p><button onClick={()=>emptyAds?navigate('Criar anúncio'):(setAdQuery(''),setAdStatus('Todos'),setAdBrand('Todas'),setAdPrice('Todos'))}>{emptyAds?'Criar primeiro anúncio':'Limpar busca e filtros'}</button></div>}
      {adModal&&<div className="modal-backdrop" role="presentation"><div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="ad-modal-title"><span className={`confirm-icon ${['Encerrar','Arquivar'].includes(adModal.action)?'danger':''}`}><Icon name={['Encerrar','Arquivar'].includes(adModal.action)?'x':'shield'}/></span><h2 id="ad-modal-title">{adModal.action} anúncio?</h2><p>Você está prestes a {adModal.action.toLowerCase()} “{adModal.title}”. Esta é uma ação demonstrativa e não altera dados reais.</p><div><button onClick={()=>setAdModal(null)}>Cancelar</button><button className={['Encerrar','Arquivar'].includes(adModal.action)?'confirm-danger':'confirm-primary'} onClick={confirmListAction}>Confirmar {adModal.action.toLowerCase()}</button></div></div></div>}
    </>)
  }

  if (active === 'Veículos') return shell(<>
    <ModuleToolbar search="Buscar por código, marca ou modelo" action="Novo veículo" onAction={()=>navigate('Cadastro de veículo')}/>
    <div className="filter-row"><button className="filter-active">Todos <span>186</span></button><button>Disponíveis <span>124</span></button><button>Reservados <span>18</span></button><button>Vendidos <span>44</span></button><select><option>Todas as marcas</option></select><select><option>Mais recentes</option></select></div>
    <div className="admin-table vehicle-table"><div className="table-head"><span>Código</span><span>Veículo</span><span>Ano</span><span>Quilometragem</span><span>Preço</span><span>Situação</span><span>Ações</span></div>{vehicleRows.map((r,i)=><div className="table-row" key={r[0]}><span>{r[0]}</span><span className="vehicle-cell"><img src={clientCars[i].image}/><strong>{r[1]}</strong></span><span>{r[2]}</span><span>{r[3]}</span><strong>{r[4]}</strong><span><Status text={r[5]}/></span><span className="row-actions"><button onClick={()=>navigate('Cadastro de veículo')}>Editar</button><button onClick={()=>act('Veículo desativado com sucesso.')}>•••</button></span></div>)}</div>
    <TableFooter/>
  </>)

  if (active === 'Cadastro de veículo') return shell(<>
    <div className="edit-banner"><div><Icon name="car"/><span><strong>Novo cadastro de veículo</strong><small>Preencha os dados comerciais e técnicos.</small></span></div><span className="unsaved">● Alterações não salvas</span></div>
    <div className="form-layout"><div className="form-stack">
      <FormSection title="Identificação" subtitle="Informações principais para o catálogo."><div className="admin-form-grid"><Field label="Marca" value="Jeep"/><Field label="Modelo" value="Compass"/><Field label="Versão" value="Longitude TD350"/><Field label="Código interno" value="Gerado automaticamente"/><Field label="Ano fabricação" value="2024"/><Field label="Ano modelo" value="2024"/></div></FormSection>
      <FormSection title="Características" subtitle="Dados técnicos do veículo."><div className="admin-form-grid"><Field label="Quilometragem" value="8.200 km"/><Field label="Combustível" value="Diesel"/><Field label="Câmbio" value="Automático"/><Field label="Cor" value="Azul Jazz"/></div></FormSection>
      <FormSection title="Preço e situação" subtitle="Condições comerciais e disponibilidade."><div className="admin-form-grid"><Field label="Preço de venda" value="R$ 159.900,00"/><Field label="Situação" value="Disponível"/></div></FormSection>
      <FormSection title="Fotografias" subtitle="Arraste para ordenar as imagens."><div className="upload-zone"><Icon name="plus"/><strong>Adicionar fotografias</strong><small>JPG ou PNG, até 8 MB por arquivo</small></div></FormSection>
    </div><aside className="form-summary"><h3>Pré-visualização</h3><img src={clientCars[0].image}/><strong>Jeep Compass Longitude</strong><span>2024 • 8.200 km</span><b>R$ 159.900,00</b><button onClick={()=>act('Pré-visualização atualizada.')}>Atualizar prévia</button></aside></div>
    <div className="form-actions"><button onClick={()=>navigate('Veículos')}>Cancelar</button><button className="save-draft">Salvar rascunho</button><button className="save-primary" onClick={()=>{act('Veículo salvo com sucesso.'); navigate('Veículos')}}>Salvar veículo</button></div>
  </>)

  if (active === 'Clientes') return shell(<>
    <ModuleToolbar search="Buscar cliente, telefone ou e-mail" action="Adicionar cliente" onAction={()=>act('Formulário de novo cliente aberto.')}/>
    <div className="admin-kpis"><MiniKpi label="Novos interessados" value="38" change="+14%"/><MiniKpi label="Aguardando contato" value="16" change="Prioridade"/><MiniKpi label="Em negociação" value="9" change="R$ 2,4 mi"/><MiniKpi label="Convertidos" value="12" change="+8%"/></div>
    <SimpleTable headers={['Cliente','Contato','Veículo de interesse','Responsável','Data','Situação']} rows={[
      ['Camila Duarte','(11) 98765-4321','Jeep Compass','Marina Souza','24/10/2025','Novo'],
      ['Rafael Lima','rafael@exemplo.com','BMW X6','João Costa','23/10/2025','Em contato'],
      ['Pedro Martins','(11) 97711-2233','Porsche 718','Marina Souza','22/10/2025','Negociação'],
      ['Lívia Almeida','livia@exemplo.com','Audi Q5','João Costa','21/10/2025','Convertido'],
    ]}/>
  </>)

  if (active === 'Agendamentos') return shell(<>
    <ModuleToolbar search="Buscar cliente ou veículo" action="Novo agendamento" onAction={()=>act('Novo agendamento criado.')}/>
    <div className="schedule-admin"><div className="week-calendar"><div className="calendar-nav"><button>‹</button><strong>20 — 26 de outubro de 2025</strong><button>›</button></div><div className="week-columns">{['SEG 20','TER 21','QUA 22','QUI 23','SEX 24'].map((day,i)=><div><strong>{day}</strong>{i===4&&<><span className="calendar-event blue">10:30 • Rafael<br/>Test-drive</span><span className="calendar-event green">14:00 • Camila<br/>Visita</span></>}{i===2&&<span className="calendar-event orange">15:30 • Pedro<br/>Test-drive</span>}</div>)}</div></div>
    <div className="today-list"><h3>Hoje <span>3 agendamentos</span></h3>{['Rafael Lima|10:30|Test-drive|Confirmado','Camila Duarte|14:00|Visita|Pendente','Pedro Martins|16:30|Test-drive|Confirmado'].map(x=>{const p=x.split('|');return <div><span className="time-block">{p[1]}</span><span><strong>{p[0]}</strong><small>{p[2]} • Jeep Compass</small></span><Status text={p[3]}/><button onClick={()=>act('Situação do agendamento atualizada.')}>Atualizar</button></div>})}</div></div>
  </>)

  if (active === 'Vendas') return shell(<>
    <div className="admin-kpis"><MiniKpi label="Vendas no mês" value="18" change="+12,4%"/><MiniKpi label="Receita" value="R$ 1,82 mi" change="+9,8%"/><MiniKpi label="Ticket médio" value="R$ 101 mil" change="+3,1%"/><MiniKpi label="Meta mensal" value="72%" change="18 de 25"/></div>
    <ModuleToolbar search="Buscar venda, veículo ou cliente" action="Registrar venda" onAction={()=>act('Etapa de registro de venda iniciada.')}/>
    <div className="sale-origin-flow"><span><strong>1. Selecionar negociação</strong><small>Lead ou agendamento não vira venda automaticamente</small></span><Icon name="arrow"/><span><strong>2. Confirmar venda</strong><small>Veículo AD-0248 • Origem opcional AN-1084</small></span><Icon name="arrow"/><span><strong>3. Atualizar disponibilidade</strong><small>Disponível → Vendido após confirmação</small></span></div>
    <SimpleTable headers={['Código','Veículo','Anúncio de origem','Cliente','Valor','Data','Responsável','Situação']} rows={[
      ['VD-1082','Audi Q5 Performance','AN-1081','Lívia Almeida','R$ 319.900,00','24/10/2025','João Costa','Concluída'],
      ['VD-1081','Honda Civic Touring','Sem anúncio','Mateus Rocha','R$ 189.900,00','22/10/2025','Marina Souza','Concluída'],
      ['VD-1080','Volvo XC60 Plus','AN-1080','Ana Ribeiro','R$ 389.900,00','20/10/2025','João Costa','Processando'],
    ]}/>
  </>)

  if (active === 'Auditoria') return shell(<>
    <div className="audit-note"><Icon name="audit"/><div><strong>Registro imutável de alterações</strong><span>Eventos administrativos armazenados no MongoDB — demonstração visual.</span></div></div>
    <ModuleToolbar search="Buscar usuário, ação ou entidade"/>
    <SimpleTable headers={['Data e horário','Usuário','Ação','Entidade','Registro','Resumo']} rows={[
      ['24/10/2025 14:32','Marina Souza','Atualização','Veículo','AD-0248','Preço alterado'],
      ['24/10/2025 14:18','Guilherme Gomes','Publicação','Anúncio','AN-1084','Anúncio publicado para AD-0248'],
      ['24/10/2025 11:08','João Costa','Criação','Venda','VD-1082','Venda registrada'],
      ['23/10/2025 17:45','Marina Souza','Atualização','Agendamento','AG-0431','Situação confirmada'],
      ['23/10/2025 09:12','Carlos Lima','Desativação','Usuário','US-0018','Acesso removido'],
    ]}/>
    <div className="audit-detail"><h3>Detalhe da alteração • AD-0248</h3><div><span>Campo</span><span>Valor anterior</span><span>Novo valor</span></div><div><strong>Preço</strong><del>R$ 164.900,00</del><ins>R$ 159.900,00</ins></div></div>
  </>)

  if (active === 'Analytics') return shell(<>
    <div className="analytics-filter"><span>Período</span><button>Últimos 30 dias ⌄</button><span>Categoria</span><button>Todas ⌄</button><button className="filter-primary" onClick={()=>act('Filtros aplicados aos resultados.')}>Aplicar filtros</button></div>
    <div className="admin-kpis"><MiniKpi label="Visualizações" value="28.450" change="+18,2%"/><MiniKpi label="Pesquisas" value="9.842" change="+11,7%"/><MiniKpi label="Taxa de interesse" value="4,8%" change="+0,6 p.p."/><MiniKpi label="Usuários únicos" value="12.420" change="+16,4%"/></div>
    <div className="analytics-grid"><AdminChart/><div className="rank-panel"><h3>Pesquisas frequentes</h3>{['Jeep Compass','SUV automático','Até R$ 150 mil','BMW X6','Baixa quilometragem'].map((x,i)=><div><span>{i+1}</span><strong>{x}</strong><small>{[1284,986,742,611,584][i]} buscas</small></div>)}</div></div>
  </>)

  if (active === 'Laboratório de tuning') return shell(<>
    <div className="lab-warning"><Icon name="lab"/><div><strong>Ambiente acadêmico de simulação</strong><span>Os resultados abaixo são fictícios e não representam execuções reais.</span></div></div>
    <div className="lab-layout"><section className="experiment-config"><h3>Configurar experimento</h3><Field label="Banco de dados" value="PostgreSQL"/><Field label="Tipo de consulta" value="Busca de veículos com filtros"/><div className="admin-form-grid"><Field label="Volume de dados" value="100.000 registros"/><Field label="Repetições" value="50"/></div><button className="run-button" onClick={()=>{setRunning(true);window.setTimeout(()=>{setRunning(false);act('Experimento demonstrativo concluído.')},1200)}}>{running ? 'Executando simulação...' : 'Executar experimento'}</button></section><section className="experiment-results"><h3>Resultado mais recente</h3><div className="result-grid"><MiniKpi label="Latência média" value="42 ms" change="-18%"/><MiniKpi label="Mediana" value="38 ms" change="p50"/><MiniKpi label="p95" value="84 ms" change="percentil"/><MiniKpi label="Operações/s" value="238" change="+22%"/></div><AdminChart/></section></div>
  </>)

  if (active === 'Disponibilidade e CAP') return shell(<>
    <div className="service-grid">{[['PostgreSQL','Operacional','99,98%'],['MongoDB replica set','Operacional','99,95%'],['Apache Cassandra','Degradado','99,72%']].map((s,i)=><article><span className={i===2?'service-dot warning':'service-dot'}/><div><strong>{s[0]}</strong><small>{s[1]}</small></div><b>{s[2]}</b></article>)}</div>
    <div className="cap-layout"><section><h3>Configurar cenário CAP</h3><label>Serviço<select><option>Apache Cassandra</option><option>MongoDB</option><option>PostgreSQL</option></select></label><label>Nível de consistência<div className="consistency"><button>ONE</button><button className="chosen">QUORUM</button><button>ALL</button></div></label><label>Falha demonstrativa<select><option>Indisponibilidade de 1 nó</option></select></label><button className="danger-demo" onClick={()=>act('Cenário demonstrativo executado sem afetar serviços reais.')}>Executar teste demonstrativo</button></section><section><h3>Resultado do cenário</h3><div className="cap-result"><Icon name="server" size={28}/><strong>Consistência preservada</strong><p>Leituras e escritas permaneceram disponíveis com QUORUM durante a indisponibilidade simulada de um nó.</p><dl><div><dt>Latência de leitura</dt><dd>28 ms</dd></div><div><dt>Latência de escrita</dt><dd>34 ms</dd></div><div><dt>Recuperação</dt><dd>1,8 s</dd></div></dl></div></section></div>
  </>)

  return shell(<>
    <ModuleToolbar search="Buscar usuário ou e-mail" action="Convidar usuário" onAction={()=>act('Convite demonstrativo enviado.')}/>
    <div className="permission-summary"><div><Icon name="shield"/><span><strong>Controle de acesso</strong><small>3 perfis e 18 usuários ativos</small></span></div><button onClick={()=>act('Matriz de permissões aberta.')}>Matriz de permissões</button></div>
    <SimpleTable headers={['Usuário','E-mail','Perfil','Situação','Cadastro','Último acesso']} rows={[
      ['Marina Souza','marina@autodealer.com.br','Administradora','Ativo','12/02/2024','Hoje, 14:32'],
      ['João Costa','joao@autodealer.com.br','Comercial','Ativo','18/03/2024','Hoje, 13:08'],
      ['Carlos Lima','carlos@autodealer.com.br','Analista','Ativo','02/05/2024','Ontem, 17:45'],
      ['Fernanda Alves','fernanda@autodealer.com.br','Comercial','Inativo','14/06/2024','18/10/2025'],
    ]}/>
  </>)
}

function ModuleToolbar({ search, action, onAction }: { search: string; action?: string; onAction?: () => void }) {
  return <div className="module-toolbar"><div><Icon name="search" size={17}/><input placeholder={search}/></div><button>Filtros</button>{action&&<button className="toolbar-primary" onClick={onAction}><Icon name="plus" size={16}/>{action}</button>}</div>
}
function Status({ text }: { text: string }) { return <span className={`status-pill ${['Disponível','Ativo','Confirmado','Concluída','Convertido','Publicado'].includes(text)?'ok':['Reservado','Pendente','Processando','Em contato','Negociação','Rascunho','Pausado'].includes(text)?'wait':'neutral'}`}>{text}</span> }
function TableFooter(){return <div className="table-footer"><span>Mostrando 1–4 de 186 registros</span><div><button>Anterior</button><button className="page-current">1</button><button>2</button><button>3</button><button>Próxima</button></div></div>}
function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <><div className="admin-table simple-table"><div className="table-head" style={{gridTemplateColumns:`repeat(${headers.length}, minmax(120px, 1fr))`}}>{headers.map(h=><span key={h}>{h}</span>)}</div>{rows.map((row,i)=><div className="table-row" style={{gridTemplateColumns:`repeat(${headers.length}, minmax(120px, 1fr))`}} key={i}>{row.map((cell,j)=><span key={j}>{j===row.length-1?<Status text={cell}/>:cell}</span>)}</div>)}</div><TableFooter/></> }
function MiniKpi({label,value,change}:{label:string;value:string;change:string}){return <article className="mini-kpi"><span>{label}</span><strong>{value}</strong><small>{change}</small></article>}
function Field({label,value}:{label:string;value:string}){return <label className="admin-field">{label}<input defaultValue={value}/></label>}
function FormSection({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){return <section className="form-section"><div><h3>{title}</h3><p>{subtitle}</p></div>{children}</section>}
function AdminChart(){return <div className="admin-chart"><div className="chart-bars">{[38,55,48,72,64,88,76,94,82,100,91,108].map((h,i)=><i key={i} style={{height:h}}/>)}</div><div className="chart-labels"><span>01 OUT</span><span>08 OUT</span><span>15 OUT</span><span>22 OUT</span></div><small>Dados fictícios para demonstração</small></div>}

type ClientPage = 'home' | 'catalog' | 'detail' | 'auth' | 'schedule' | 'account'

const clientCars = [
  { name: 'Jeep Compass Longitude', year: '2024', km: '8.200 km', price: 'R$ 159.900,00', tag: 'Seminovo', image: 'https://images.unsplash.com/photo-1611168935847-4bf3f7291cde?auto=format&fit=crop&w=900&q=85' },
  { name: 'BMW X6 M Sport', year: '2023', km: '12.400 km', price: 'R$ 689.900,00', tag: 'Destaque', image: 'https://images.unsplash.com/photo-1763165562062-91d744691c65?auto=format&fit=crop&w=900&q=85' },
  { name: 'Porsche 718 Cayman', year: '2024', km: '3.100 km', price: 'R$ 599.900,00', tag: 'Premium', image: 'https://images.unsplash.com/photo-1763165561886-a9391b2132c1?auto=format&fit=crop&w=900&q=85' },
  { name: 'Audi Q5 Performance', year: '2023', km: '18.700 km', price: 'R$ 319.900,00', tag: 'Revisado', image: 'https://images.unsplash.com/photo-1763596554361-38b21e76e666?auto=format&fit=crop&w=900&q=85' },
  { name: 'Volvo XC60 Plus', year: '2024', km: '6.850 km', price: 'R$ 389.900,00', tag: 'Baixa km', image: 'https://images.unsplash.com/photo-1791656184137-4a0523f7349f?auto=format&fit=crop&w=900&q=85' },
  { name: 'Mercedes-Benz GLC', year: '2023', km: '21.000 km', price: 'R$ 429.900,00', tag: 'Certificado', image: 'https://images.unsplash.com/photo-1774979300787-bd3563a085b8?auto=format&fit=crop&w=900&q=85' },
]

const vehicleAvailability: Record<string, boolean> = {
  'Jeep Compass Longitude': true,
  'BMW X6 M Sport': false,
  'Porsche 718 Cayman': true,
  'Audi Q5 Performance': true,
  'Volvo XC60 Plus': true,
}
const publicAds = adRows.filter(ad => ad.status === 'Publicado' && vehicleAvailability[ad.vehicle] === true)
const publicCars = publicAds.map(ad => {
  const vehicle = clientCars.find(car => car.name === ad.vehicle)
  return { ...(vehicle || clientCars[0]), name:ad.vehicle, price:ad.price, image:ad.image.replace('w=240','w=900'), tag:'Anúncio publicado', adId:ad.id }
})

export default function App() {
  const [area, setArea] = useState<'client' | 'admin' | 'flows'>('client')
  const [clientStart, setClientStart] = useState<ClientPage>('home')
  const [adminStart, setAdminStart] = useState('Visão geral')
  const openFrame = (target: 'client' | 'admin', frame: string) => {
    if (target === 'client') setClientStart(frame as ClientPage)
    else setAdminStart(frame)
    setArea(target)
  }
  if (area === 'admin') return <AdminApp initialActive={adminStart} onCustomer={(page='home') => { setClientStart(page); setArea('client') }} onFlows={() => setArea('flows')}/>
  if (area === 'flows') return <FlowPage onBack={()=>setArea('admin')} openFrame={openFrame}/>
  return <ClientApp initialPage={clientStart} onAdmin={() => setArea('admin')} onFlows={() => setArea('flows')}/>
}

function ClientApp({ onAdmin, onFlows, initialPage = 'home' }: { onAdmin: () => void; onFlows: () => void; initialPage?: ClientPage }) {
  const [page, setPage] = useState<ClientPage>(initialPage)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const go = (next: ClientPage) => { setPage(next); setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  return <div className="client-app">
    <header className="client-header">
      <button className="client-logo" onClick={() => go('home')}><span><Icon name="car" size={22}/></span><strong>AutoDealer<small>Veículos selecionados</small></strong></button>
      <nav className={mobileMenu ? 'client-nav open' : 'client-nav'}>
        <button onClick={() => go('home')} className={page === 'home' ? 'selected' : ''}>Início</button>
        <button onClick={() => go('catalog')} className={page === 'catalog' || page === 'detail' ? 'selected' : ''}>Veículos</button>
        <button onClick={() => go('schedule')}>Agende uma visita</button>
        <button onClick={() => go('account')}>Minha conta</button>
      </nav>
      <div className="client-actions"><button className="admin-link" onClick={onAdmin}>Área administrativa</button><button className="outline-action" onClick={() => go('auth')}><Icon name="users" size={17}/> Entrar</button><button className="client-menu" onClick={() => setMobileMenu(!mobileMenu)}><Icon name={mobileMenu ? 'x' : 'menu'}/></button></div>
    </header>
    {page === 'home' && <ClientHome go={go}/>}
    {page === 'catalog' && <LiveCatalog onSelect={id=>{setSelectedVehicleId(id);go('detail')}}/>}
    {page === 'detail' && <LiveVehicleDetail id={selectedVehicleId} onBack={()=>go('catalog')}/>}
    {page === 'auth' && <Auth go={go}/>}
    {page === 'schedule' && <Schedule go={go}/>}
    {page === 'account' && <Account go={go}/>}
    <footer className="client-footer"><div className="client-logo light"><span><Icon name="car" size={22}/></span><strong>AutoDealer<small>Veículos selecionados</small></strong></div><p>Dados e veículos fictícios para demonstração acadêmica.</p><div><button onClick={() => go('catalog')}>Estoque</button><button onClick={() => go('schedule')}>Agendamento</button><button onClick={() => go('auth')}>Entrar</button><button onClick={onFlows}>Fluxos</button></div></footer>
    <nav className="client-mobile-nav" aria-label="Navegação móvel"><button className={page==='home'?'active':''} onClick={()=>go('home')}><Icon name="grid"/><span>Início</span></button><button className={page==='catalog'||page==='detail'?'active':''} onClick={()=>go('catalog')}><Icon name="car"/><span>Veículos</span></button><button className={page==='schedule'?'active':''} onClick={()=>go('schedule')}><Icon name="calendar"/><span>Agendar</span></button><button className={page==='account'?'active':''} onClick={()=>go('account')}><Icon name="users"/><span>Conta</span></button></nav>
  </div>
}

function ClientHome({ go }: { go: (p: ClientPage) => void }) {
  return <main className="client-main home-page" data-frame="C01 — Home — Responsivo">
    <section className="hero">
      <img src="https://images.unsplash.com/photo-1763165524644-a21524b47734?auto=format&fit=crop&w=1800&q=88" alt="Automóvel premium azul em showroom"/>
      <div className="hero-overlay"/><div className="hero-content"><span className="hero-kicker">ESCOLHA COM CONFIANÇA</span><h1>Encontre o carro ideal para você</h1><p>Veículos selecionados, procedência verificada e uma experiência de compra transparente.</p>
        <div className="hero-search"><div><Icon name="search"/><input placeholder="Busque por marca ou modelo"/></div><button onClick={() => go('catalog')}>Explorar veículos <Icon name="arrow" size={18}/></button></div>
        <div className="quick-filters"><span>Buscas rápidas:</span><button>SUV</button><button>Até R$ 150 mil</button><button>Automático</button></div>
      </div>
    </section>
    <section className="client-section"><div className="section-title"><div><span>SELEÇÃO ESPECIAL</span><h2>Veículos em destaque</h2><p>Anúncios publicados de veículos disponíveis • dados simulados.</p></div><button onClick={() => go('catalog')}>Ver todos <Icon name="arrow" size={17}/></button></div><div className="car-grid">{publicCars.map(car => <CarCard key={car.name} car={car} onClick={() => go('detail')}/>)}</div></section>
    <section className="categories client-section"><div className="section-title"><div><span>ENCONTRE SEU ESTILO</span><h2>Explore por categoria</h2></div></div><div className="category-grid">{['SUV','Sedan','Hatch','Picape'].map((c,i)=><button key={c} onClick={()=>go('catalog')}><span>{['18 veículos','12 veículos','9 veículos','7 veículos'][i]}</span><strong>{c}</strong><Icon name="arrow"/></button>)}</div></section>
    <section className="trust-strip"><div><Icon name="shield" size={27}/><span><strong>Procedência verificada</strong><small>Histórico e documentação revisados</small></span></div><div><Icon name="car" size={27}/><span><strong>Curadoria especializada</strong><small>Veículos criteriosamente selecionados</small></span></div><div><Icon name="users" size={27}/><span><strong>Atendimento consultivo</strong><small>Do primeiro contato à entrega</small></span></div></section>
    <section className="home-cta"><div><span>PRONTO PARA CONHECER SEU PRÓXIMO CARRO?</span><h2>Agende uma visita ao nosso showroom</h2><p>Escolha o melhor dia e horário. Nossa equipe deixa tudo preparado para você.</p></div><button onClick={() => go('schedule')}>Agendar visita <Icon name="calendar" size={18}/></button></section>
  </main>
}

function CarCard({ car, onClick }: { car: typeof clientCars[0] & { adId?:string }; onClick: () => void }) {
  return <article className="car-card" onClick={onClick}><div className="car-image"><img src={car.image} alt={car.name}/><span>{car.tag}</span><button aria-label="Favoritar">♡</button></div><div className="car-info">{car.adId&&<small className="public-ad-ref">{car.adId} • Dados simulados</small>}<h3>{car.name}</h3><div className="car-meta"><span>{car.year}</span><i/><span>{car.km}</span><i/><span>Automático</span></div><div className="car-price"><span>A partir de</span><strong>{car.price}</strong></div><button>Ver detalhes <Icon name="arrow" size={16}/></button></div></article>
}

function Catalog({ go }: { go: (p: ClientPage) => void }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('relevant')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const visibleCars = publicCars
    .filter(car => car.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === 'price' ? Number(a.price.replace(/\D/g, '')) - Number(b.price.replace(/\D/g, '')) : 0)
  return <main className="client-main inner-page" data-frame="C02 — Catálogo — Responsivo"><div className="inner-head"><div><span>INÍCIO / VEÍCULOS</span><h1>Encontre seu próximo veículo</h1><p>{publicCars.length} anúncios publicados de veículos disponíveis • dados simulados.</p></div></div>
    <div className="catalog-layout"><aside className={`filters ${filtersOpen ? 'filters-open' : ''}`}><div><h2>Filtros</h2><button onClick={()=>setFiltersOpen(false)}>Fechar</button></div><label>Marca<select><option>Todas as marcas</option><option>Jeep</option><option>BMW</option></select></label><label>Categoria<select><option>Todas</option><option>SUV</option><option>Sedan</option></select></label><label>Faixa de preço<div className="dual-input"><input value="R$ 80.000" readOnly/><input value="R$ 700.000" readOnly/></div></label><label>Ano mínimo<select><option>2020</option><option>2022</option></select></label><label>Combustível<select><option>Todos</option><option>Flex</option><option>Gasolina</option></select></label><button className="apply-filter" onClick={()=>setFiltersOpen(false)}>Aplicar filtros</button></aside>
      <section className="results"><div className="catalog-tools"><div className="catalog-search"><Icon name="search" size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Marca, modelo ou versão"/></div><button className="mobile-filter" onClick={()=>setFiltersOpen(true)}>Filtros</button><select value={sort} onChange={e=>setSort(e.target.value)}><option value="relevant">Mais relevantes</option><option value="price">Menor preço</option></select></div><div className="active-filters"><span>Seminovos ×</span><span>Câmbio automático ×</span></div>{visibleCars.length ? <div className="catalog-grid">{visibleCars.map(car => <CarCard key={car.name} car={car} onClick={()=>go('detail')}/>)}</div> : <div className="catalog-empty"><Icon name="search" size={28}/><h2>Nenhum veículo encontrado</h2><p>Tente buscar por outra marca ou modelo.</p><button onClick={()=>setQuery('')}>Limpar busca</button></div>}<div className="pagination"><button>‹</button><button className="current">1</button><button>2</button><button>3</button><button>›</button></div></section>
    </div>
  </main>
}

function VehicleDetail({ go }: { go: (p: ClientPage) => void }) {
  const car = publicCars[0] || clientCars[0]
  const [interest, setInterest] = useState(false)
  const [leadConfirmed, setLeadConfirmed] = useState(false)
  return <main className="client-main inner-page detail-page" data-frame="C03 — Detalhes — Responsivo"><button className="back-link" onClick={()=>go('catalog')}>← Voltar para veículos</button>
    <div className="gallery"><img className="main-photo" src={car.image} alt={car.name}/>{clientCars.slice(1,5).map(c=><img key={c.name} src={c.image} alt="Detalhe do veículo"/>)}<span>+ 8 fotos</span></div>
    <div className="detail-layout"><section><span className="availability">● Disponível</span><p className="detail-code">CÓD. AD-0248</p><h1>{car.name}</h1><p className="version">2.0 TD350 Turbo Diesel 4x4 AT9</p><div className="spec-grid">{[['calendar','2024 / 2024','Ano'],['chart','8.200 km','Quilometragem'],['lab','Diesel','Combustível'],['server','Automático','Câmbio'],['car','Azul Jazz','Cor'],['grid','170 cv','Potência']].map(([icon,value,label])=><div key={label}><Icon name={icon as IconName}/><span><strong>{value}</strong><small>{label}</small></span></div>)}</div><div className="description"><h2>Sobre este veículo</h2><p>Veículo fictício em excelente estado, com revisões em dia e configuração completa. Inspecionado por nossa equipe especializada em mais de 100 itens.</p></div></section>
      <aside className="purchase-card"><span>Preço do veículo</span><strong>{car.price}</strong><p>{'adId' in car ? `${car.adId} • Anúncio demonstrativo` : 'Dados demonstrativos'}</p><button className="interest" onClick={()=>setInterest(true)}>Tenho interesse</button><button className="testdrive" onClick={()=>go('schedule')}><Icon name="calendar" size={18}/> Agendar visita ou test-drive</button><div><Icon name="shield" size={19}/><span><strong>Compra segura</strong><small>Procedência e documentação verificadas</small></span></div></aside>
    </div>
    {leadConfirmed&&<div className="lead-success"><Icon name="shield"/><div><strong>Interesse confirmado</strong><span>Lead demonstrativo LD-2048 criado para anúncio AN-1084 e veículo AD-0248. Nenhuma venda foi criada automaticamente.</span></div><button onClick={()=>go('account')}>Acompanhar na conta</button></div>}
    <section className="similar"><div className="section-title"><div><span>OUTROS ANÚNCIOS PUBLICADOS</span><h2>Veículos disponíveis</h2></div></div><div className="car-grid">{publicCars.filter(c=>c.name!==car.name).map(c=><CarCard car={c} key={c.name} onClick={()=>go('detail')}/>)}</div></section>
    {interest&&<div className="modal-backdrop"><div className="confirm-modal"><span className="confirm-icon"><Icon name="users"/></span><h2>Confirmar interesse?</h2><p>Será criado um lead demonstrativo referenciando anúncio AN-1084 e veículo AD-0248. Isso não cria agendamento nem venda.</p><div><button onClick={()=>setInterest(false)}>Cancelar</button><button className="confirm-primary" onClick={()=>{setInterest(false);setLeadConfirmed(true)}}>Confirmar interesse</button></div></div></div>}
  </main>
}

function Auth({ go }: { go: (p: ClientPage) => void }) {
  const [tab,setTab]=useState<'login'|'register'|'recover'>('login')
  return <main className="auth-page" data-frame="C04 — Autenticação — Responsivo"><section className="auth-visual"><img src="https://images.unsplash.com/photo-1763596553951-3eb8ead97494?auto=format&fit=crop&w=1200&q=85" alt="Detalhe de veículo premium"/><div><span>AUTO DEALER EXPERIENCE</span><h1>Sua jornada começa aqui.</h1><p>Salve veículos, acompanhe solicitações e gerencie seus agendamentos.</p></div></section><section className="auth-form"><div><span className="auth-icon"><Icon name="shield"/></span><h1>{tab==='login'?'Boas-vindas':tab==='register'?'Crie sua conta':'Recupere sua senha'}</h1><p>{tab==='login'?'Acesse sua conta para continuar.':tab==='register'?'Preencha seus dados para começar.':'Enviaremos as instruções para seu e-mail.'}</p>{tab!=='recover'&&<div className="auth-tabs"><button className={tab==='login'?'active':''} onClick={()=>setTab('login')}>Entrar</button><button className={tab==='register'?'active':''} onClick={()=>setTab('register')}>Cadastrar</button></div>}{tab==='register'&&<label>Nome completo<input placeholder="Seu nome"/></label>}<label>E-mail<input type="email" placeholder="nome@exemplo.com"/></label>{tab!=='recover'&&<label>Senha<input type="password" placeholder="••••••••"/></label>}{tab==='login'&&<button className="forgot" onClick={()=>setTab('recover')}>Esqueci minha senha</button>}<button className="auth-submit" onClick={()=>go('account')}>{tab==='login'?'Entrar':tab==='register'?'Criar conta':'Enviar instruções'}</button>{tab==='recover'&&<button className="back-auth" onClick={()=>setTab('login')}>Voltar ao login</button>}<small>Ambiente demonstrativo — nenhuma credencial real é necessária.</small></div></section></main>
}

function Schedule({ go }: { go: (p: ClientPage) => void }) {
  const [time,setTime]=useState('14:00')
  return <main className="client-main inner-page schedule-page" data-frame="C05 — Agendamento — Responsivo"><div className="inner-head"><div><span>AGENDAMENTO</span><h1>Agende sua experiência</h1><p>Escolha como e quando deseja conhecer o veículo.</p></div></div><div className="booking-layout"><section className="booking-form"><div className="step-head"><span>1</span><div><h2>Tipo de atendimento</h2><p>Como você prefere conhecer o veículo?</p></div></div><div className="visit-types"><button className="chosen"><Icon name="car"/><strong>Test-drive</strong><small>Dirija e conheça todos os detalhes</small></button><button><Icon name="users"/><strong>Visita ao showroom</strong><small>Atendimento consultivo presencial</small></button></div><div className="step-head"><span>2</span><div><h2>Data e horário</h2><p>Selecione uma opção disponível.</p></div></div><div className="booking-date"><div className="mini-calendar"><div><button>‹</button><strong>Novembro 2025</strong><button>›</button></div><div className="week">{['D','S','T','Q','Q','S','S'].map(x=><span>{x}</span>)}</div><div className="days">{Array.from({length:35},(_,i)=><button className={i===18?'selected-day':i<5?'muted':''}>{i<5?27+i:i-4}</button>)}</div></div><div className="times"><strong>Quarta, 14 de novembro</strong>{['09:00','10:30','14:00','15:30','17:00'].map(t=><button className={time===t?'selected-time':''} onClick={()=>setTime(t)}>{t}</button>)}</div></div></section><aside className="booking-summary"><h2>Resumo do agendamento</h2><div className="summary-car"><img src={clientCars[0].image}/><span><strong>{clientCars[0].name}</strong><small>2024 • Diesel • Automático</small><small>AN-1084 • Veículo AD-0248</small></span></div><dl><div><dt>Atendimento</dt><dd>Test-drive</dd></div><div><dt>Data</dt><dd>14/11/2025</dd></div><div><dt>Horário</dt><dd>{time}</dd></div></dl><button onClick={()=>go('account')}>Confirmar agendamento</button><p>Agendamento demonstrativo vinculado a AN-1084 e AD-0248. Não gera venda automaticamente.</p></aside></div></main>
}

function Account({ go }: { go: (p: ClientPage) => void }) {
  const [tab,setTab]=useState('Agendamentos')
  return <main className="client-main inner-page account-page" data-frame="C06 — Minha Conta — Responsivo"><div className="account-welcome"><div className="account-avatar">RM</div><div><span>MINHA CONTA</span><h1>Olá, Rafael</h1><p>Gerencie seus dados e acompanhe suas solicitações.</p></div><button onClick={()=>go('home')}>Sair</button></div><div className="account-layout"><aside><button className={tab==='Perfil'?'active':''} onClick={()=>setTab('Perfil')}><Icon name="users"/> Meu perfil</button><button className={tab==='Agendamentos'?'active':''} onClick={()=>setTab('Agendamentos')}><Icon name="calendar"/> Agendamentos <span>2</span></button><button className={tab==='Solicitações'?'active':''} onClick={()=>setTab('Solicitações')}><Icon name="car"/> Solicitações <span>1</span></button><button className={tab==='Histórico'?'active':''} onClick={()=>setTab('Histórico')}><Icon name="audit"/> Histórico</button></aside><section><div className="account-section-head"><div><h2>{tab}</h2><p>Acompanhe e gerencie suas informações.</p></div>{tab==='Agendamentos'&&<button onClick={()=>go('schedule')}>Novo agendamento</button>}</div>{tab==='Perfil'?<div className="profile-form"><label>Nome completo<input value="Rafael Mendes" readOnly/></label><label>E-mail<input value="rafael@exemplo.com" readOnly/></label><label>Telefone<input value="(11) 99999-0000" readOnly/></label><button>Editar dados</button></div>:tab==='Solicitações'?<div className="request-card"><img src={clientCars[0].image} alt={clientCars[0].name}/><div><span className="status-confirmed">Em atendimento</span><h3>Interesse em {clientCars[0].name}</h3><p>Lead LD-2048 • Anúncio AN-1084 • Veículo AD-0248 • Enviado em 10/11/2025.</p></div><button onClick={()=>go('detail')}>Ver veículo</button></div>:tab==='Histórico'?<div className="history-list"><div><Icon name="shield"/><span><strong>Cadastro atualizado</strong><small>10/11/2025 às 18:42</small></span></div><div><Icon name="calendar"/><span><strong>Agendamento confirmado</strong><small>09/11/2025 às 14:08</small></span></div></div>:<div className="account-cards"><article><div className="account-card-date"><strong>14</strong><span>NOV</span></div><div><span className="status-confirmed">Confirmado</span><h3>Test-drive • Jeep Compass Longitude</h3><p>14/11/2025 às 14:00 • AN-1084 • AD-0248</p></div><button>Ver detalhes</button></article><article><div className="account-card-date past"><strong>08</strong><span>OUT</span></div><div><span className="status-done">Concluído</span><h3>Visita • BMW X6 M Sport</h3><p>08/10/2025 às 10:30 • Showroom AutoDealer</p></div><button>Ver detalhes</button></article></div>}</section></div></main>
}

type FlowNode = {
  id: string
  title: string
  detail: string
  kind?: 'start' | 'screen' | 'decision' | 'error' | 'cancel' | 'success'
  target?: ['client' | 'admin', string]
  branches?: string[]
}

const flowSets: Record<string, { subtitle: string; owner: string; nodes: FlowNode[] }> = {
  consumidor: {
    owner: 'Consumidor',
    subtitle: 'Descoberta, autenticação, interesse e agendamento.',
    nodes: [
      { id:'c1', title:'Início', detail:'Entrada no site comercial', kind:'start', target:['client','home'] },
      { id:'c2', title:'Explorar catálogo', detail:'Busca, filtros e ordenação', kind:'screen', target:['client','catalog'] },
      { id:'c3', title:'Encontrou um veículo?', detail:'Valida resultados da busca', kind:'decision', branches:['Não → ajustar filtros','Sim → abrir detalhes'] },
      { id:'c4', title:'Detalhes do veículo', detail:'Anúncio publicado AN-1084 + veículo disponível AD-0248', kind:'screen', target:['client','detail'] },
      { id:'c5', title:'Possui conta?', detail:'Validação de sessão', kind:'decision', branches:['Não → cadastro','Sim → continuar'] },
      { id:'c6', title:'Login ou cadastro', detail:'Validação de dados e credenciais', kind:'screen', target:['client','auth'] },
      { id:'c7', title:'Credenciais inválidas', detail:'Exibir erro e permitir nova tentativa', kind:'error' },
      { id:'c8', title:'Agendar experiência', detail:'Tipo, data e horário', kind:'screen', target:['client','schedule'] },
      { id:'c9', title:'Horário disponível?', detail:'Confere disponibilidade demonstrativa', kind:'decision', branches:['Não → escolher outro','Sim → confirmar'] },
      { id:'c10', title:'Agendamento confirmado', detail:'Lead e agendamento mantêm referências AN-1084 / AD-0248', kind:'success', target:['client','account'] },
      { id:'c11', title:'Cancelar solicitação', detail:'Confirmação antes de cancelar', kind:'cancel', target:['client','account'] },
    ],
  },
  administrador: {
    owner: 'Administrador • Guilherme Gomes',
    subtitle: 'Gestão de estoque, auditoria e permissões.',
    nodes: [
      { id:'a1', title:'Login administrativo', detail:'Guilherme informa suas credenciais', kind:'start', target:['client','auth'] },
      { id:'a2', title:'Acesso autorizado?', detail:'Valida perfil Administrador', kind:'decision', branches:['Não → acesso negado','Sim → dashboard'] },
      { id:'a3', title:'Acesso negado', detail:'Mensagem de erro e recuperação', kind:'error' },
      { id:'a4', title:'Dashboard', detail:'Indicadores e atalhos operacionais', kind:'screen', target:['admin','Visão geral'] },
      { id:'a4b', title:'Gestão de anúncios', detail:'Publicar somente veículos disponíveis e acompanhar métricas simuladas', kind:'screen', target:['admin','Anúncios'] },
      { id:'a5', title:'Gestão de veículos', detail:'Consulta estoque e seleciona registro', kind:'screen', target:['admin','Veículos'] },
      { id:'a6', title:'Cadastrar ou editar', detail:'Dados, características, preço e fotos', kind:'screen', target:['admin','Cadastro de veículo'] },
      { id:'a7', title:'Formulário válido?', detail:'Valida campos obrigatórios', kind:'decision', branches:['Não → destacar erros','Sim → salvar'] },
      { id:'a8', title:'Alterações não salvas', detail:'Confirmar saída ou permanecer', kind:'cancel' },
      { id:'a9', title:'Veículo salvo', detail:'Atualiza listagem e disponibilidade', kind:'success', target:['admin','Veículos'] },
      { id:'a10', title:'Auditoria', detail:'Consultar preço anterior e novo', kind:'screen', target:['admin','Auditoria'] },
      { id:'a11', title:'Usuários e permissões', detail:'Perfis, ativação e acessos', kind:'screen', target:['admin','Usuários e permissões'] },
    ],
  },
  vendedor: {
    owner: 'Vendedor',
    subtitle: 'Lead, agendamento, negociação e venda.',
    nodes: [
      { id:'v1', title:'Dashboard comercial', detail:'Visualiza solicitações pendentes', kind:'start', target:['admin','Visão geral'] },
      { id:'v2', title:'Clientes e leads', detail:'Seleciona interessado prioritário', kind:'screen', target:['admin','Clientes'] },
      { id:'v3', title:'Contato realizado?', detail:'Registra tentativa de atendimento', kind:'decision', branches:['Não → reagendar contato','Sim → qualificar'] },
      { id:'v4', title:'Lead sem retorno', detail:'Manter pendente ou encerrar', kind:'cancel' },
      { id:'v5', title:'Agendar visita', detail:'Seleciona veículo, data e horário', kind:'screen', target:['admin','Agendamentos'] },
      { id:'v6', title:'Cliente compareceu?', detail:'Atualiza situação do agendamento', kind:'decision', branches:['Não → marcar ausência','Sim → negociar'] },
      { id:'v7', title:'Venda aprovada?', detail:'Confirma cliente, veículo e valor', kind:'decision', branches:['Não → manter negociação','Sim → registrar'] },
      { id:'v8', title:'Registrar venda', detail:'Confirma veículo, cliente e anúncio de origem quando aplicável', kind:'screen', target:['admin','Vendas'] },
      { id:'v9', title:'Falha no registro', detail:'Preserva dados e oferece nova tentativa', kind:'error' },
      { id:'v10', title:'Venda concluída', detail:'Atualiza disponibilidade após confirmação; nunca converte lead automaticamente', kind:'success', target:['admin','Vendas'] },
      { id:'v11', title:'Auditoria gerada', detail:'Histórico da operação registrado', kind:'screen', target:['admin','Auditoria'] },
    ],
  },
}

function FlowPage({ onBack, openFrame }: { onBack: () => void; openFrame: (target:'client'|'admin', frame:string) => void }) {
  const [flow, setFlow] = useState('consumidor')
  const current = flowSets[flow]
  return <div className="flow-page">
    <header className="flow-header"><div className="client-logo light"><span><Icon name="chart" size={22}/></span><strong>AutoDealer<small>Mapas de experiência</small></strong></div><div><span className="editable-hint">Clique nos textos para editar</span><button onClick={onBack}>Voltar ao produto</button></div></header>
    <main className="flow-main">
      <div className="flow-title"><div><span>06 — FLUXOS</span><h1>Jornadas do AutoDealer</h1><p>Diagramas editáveis conectados às telas reais do protótipo.</p></div><button onClick={()=>window.print()}>Exportar diagrama</button></div>
      <nav className="flow-tabs">{Object.entries(flowSets).map(([key,value])=><button key={key} className={flow===key?'active':''} onClick={()=>setFlow(key)}><Icon name={key==='consumidor'?'users':key==='administrador'?'shield':'sale'} size={18}/><span><strong>{value.owner}</strong><small>{value.subtitle}</small></span></button>)}</nav>
      <section className="flow-canvas">
        <div className="flow-canvas-head"><div><strong contentEditable suppressContentEditableWarning>{current.owner}</strong><span contentEditable suppressContentEditableWarning>{current.subtitle}</span></div><div className="flow-legend"><span><i className="screen"/>Tela real</span><span><i className="decision"/>Decisão</span><span><i className="error"/>Erro</span><span><i className="success"/>Confirmação</span></div></div>
        <div className="flow-track">{current.nodes.map((node,index)=><div className="flow-step-wrap" key={node.id}>
          <article className={`flow-node ${node.kind || 'screen'}`}>
            <span className="node-number">{String(index+1).padStart(2,'0')}</span>
            <div contentEditable suppressContentEditableWarning><strong>{node.title}</strong><p>{node.detail}</p></div>
            {node.branches&&<div className="node-branches">{node.branches.map((branch,i)=><span key={branch} className={i?'yes':'no'} contentEditable suppressContentEditableWarning>{branch}</span>)}</div>}
            {node.target&&<button onClick={()=>openFrame(node.target![0],node.target![1])}>Abrir tela <Icon name="arrow" size={14}/></button>}
          </article>
          {index<current.nodes.length-1&&<div className="flow-connector"><span/><Icon name="arrow" size={16}/></div>}
        </div>)}</div>
      </section>
      <div className="flow-notes"><div><Icon name="audit"/><span><strong>Validações incluídas</strong><small>Credenciais, formulário, disponibilidade, comparecimento e aprovação da venda.</small></span></div><div><Icon name="x"/><span><strong>Exceções incluídas</strong><small>Erros, acesso negado, ausência, nova tentativa e cancelamentos com confirmação.</small></span></div><div><Icon name="shield"/><span><strong>Confirmações incluídas</strong><small>Agendamento, salvamento, venda e registro de auditoria.</small></span></div></div>
    </main>
  </div>
}

function Appointment({ time, name, car, tone }: { time: string; name: string; car: string; tone: string }) {
  return <div className="appointment"><div className="time"><strong>{time}</strong><span>45 min</span></div><i className={tone}/><div className="appointment-info"><strong>{name}</strong><span>{car}</span></div><button aria-label={`Abrir agendamento de ${name}`}><Icon name="chevron" size={16}/></button></div>
}
