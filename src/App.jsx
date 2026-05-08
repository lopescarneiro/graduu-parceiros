import { useState, useEffect, useRef } from "react";
import { loadData, saveData } from "./lib/storage.js";
import { POLOS_SISTEMA, searchPolos } from "./lib/polos.js";

const ADMIN_EMAIL = "admin@graduu.com.br";
const ADMIN_PASS = "graduu2024";
const C = { dark:"#1a1a3e", purple:"#2d1b5e", pink:"#e05a8a", green:"#00e07a", danger:"#dc3545", warn:"#f59e0b" };
const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const COMMISSION_TABLE = [
  { categoria:"IA e Automação Digital", valor:300.00 },
  { categoria:"Área de TI (Geral)", valor:244.30 },
  { categoria:"Graduação EAD Geral", valor:174.30 },
  { categoria:"Semipresencial (Máx.)", valor:377.30 },
  { categoria:"Semipresencial (Médio)", valor:342.30 },
  { categoria:"Semipresencial (Básico)", valor:259.90 },
  { categoria:"Pós-Graduação (1+4)", valor:125.94 },
  { categoria:"Pós-Graduação (1+6)", valor:95.94 },
  { categoria:"Pós-Graduação (1+12)", valor:65.94 },
];
const STATUS_PIPELINE = ["Indicado","Em atendimento","Matrícula iniciada","Matrícula concluída","Adesão paga","Comissão liberada","Comissão paga"];
const STATUS_BG = { "Indicado":"#e0f0ff","Em atendimento":"#fff3cd","Matrícula iniciada":"#fde8d8","Matrícula concluída":"#d4edda","Adesão paga":"#c3e6cb","Comissão liberada":"#b8daff","Comissão paga":"#c3e6cb","Glosado":"#f8d7da" };
const STATUS_TX = { "Indicado":"#0056b3","Em atendimento":"#856404","Matrícula iniciada":"#7a3b00","Matrícula concluída":"#155724","Adesão paga":"#0a3d1f","Comissão liberada":"#004085","Comissão paga":"#0a3d1f","Glosado":"#721c24" };
const KANBAN_COLS = [
  { key:"Indicado", color:"#dbeafe", border:"#93c5fd", text:"#1e40af" },
  { key:"Em atendimento", color:"#fef9c3", border:"#fde047", text:"#854d0e" },
  { key:"Matrícula iniciada", color:"#ffedd5", border:"#fdba74", text:"#7c2d12" },
  { key:"Matrícula concluída", color:"#dcfce7", border:"#86efac", text:"#14532d" },
  { key:"Adesão paga", color:"#d1fae5", border:"#34d399", text:"#064e3b" },
  { key:"Comissão liberada", color:"#e0e7ff", border:"#a5b4fc", text:"#3730a3" },
  { key:"Comissão paga", color:"#f0fdf4", border:"#4ade80", text:"#166534" },
];
const CONTRACT_TEXT = `CONTRATO DE ADESÃO — PROGRAMA DE PARCERIA EDUCACIONAL INDEPENDENTE\n\nEntre GRADUU EDUCACIONAL (CNPJ 53.875.358/0001-24) e o PARCEIRO identificado no cadastro.\n\nCláusula 1 – Objeto: Participação no Programa de Parceria Educacional para captação de alunos para cursos da Faculdade UniFECAF.\n\nCláusula 2 – Atividades: O parceiro atuará de forma autônoma e independente na prospecção, indicação e matrícula de candidatos.\n\nCláusula 3 – Comissionamento: 100% do valor da taxa de adesão paga pelo aluno é repassado ao parceiro, via PIX, semanalmente às sextas-feiras.\n\nCláusula 4 – Pagamento: O aluno paga diretamente à GRADUU. O parceiro não está autorizado a receber valores do aluno.\n\nCláusula 5 – Vigência: Prazo indeterminado. Qualquer parte pode rescindir com comunicação prévia.\n\nCláusula 6 – LGPD: O parceiro se compromete a coletar dados pessoais somente para fins de prospecção e matrícula.\n\nForo: Comarca de Sorocaba/SP.`;

const iStyle = { display:"block", width:"100%", boxSizing:"border-box", padding:"9px 12px", fontSize:14, borderRadius:8, border:"1.5px solid #b0b0b0", background:"#fff", color:"#111", outline:"none", fontFamily:"inherit" };
const lStyle = { display:"block", fontSize:12, color:"#555", marginBottom:4 };
const btnP = { background:`linear-gradient(135deg,${C.dark},${C.purple})`, color:"#fff", border:"none", borderRadius:8, padding:"10px 20px", fontSize:14, fontWeight:500, cursor:"pointer" };

// ── helpers ──
function dadosCandidatoCompletos(lead) {
  const d = lead.dadosCandidato||{};
  return ["nomeCompleto","cpf","rg","nascimento","email","telefone","endereco","estadoCivil"].every(k=>d[k]?.trim());
}
function matriculaConfirmada(lead) { return !!lead.tipoMatricula; }
function getMes() { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; }
function getDiaMes() { return new Date().getDate(); }
function getDiasNoMes() { const n=new Date(); return new Date(n.getFullYear(),n.getMonth()+1,0).getDate(); }
function calcPace(realizado) {
  const dia=getDiaMes(); const totalDias=getDiasNoMes();
  return dia>0 ? Math.round((realizado/dia)*totalDias) : 0;
}
function calcForecast(realizado,meta) {
  const pace=calcPace(realizado);
  return { pace, percentPace: meta>0?Math.round((pace/meta)*100):0, percentReal: meta>0?Math.round((realizado/meta)*100):0 };
}

// ── shared UI ──
function Inp({ label, value, onChange, type="text", placeholder="" }) {
  return (
    <div>
      <label style={lStyle}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={iStyle}/>
    </div>
  );
}
function Sel({ label, value, onChange, options }) {
  return (
    <div>
      <label style={lStyle}>{label}</label>
      <select value={value} onChange={onChange} style={iStyle}>
        <option value="">Selecione...</option>
        {options.map(o=><option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
function Badge({ status }) {
  return <span style={{ background:STATUS_BG[status]||"#eee", color:STATUS_TX[status]||"#333", fontSize:11, padding:"2px 8px", borderRadius:20, fontWeight:500, whiteSpace:"nowrap" }}>{status}</span>;
}
function RoleBadge({ role }) {
  const map = { admin:{bg:C.dark,tx:"#fff",l:"Super Admin"}, gestor:{bg:"#e0e7ff",tx:"#3730a3",l:"Gestor"}, consultor:{bg:"#fef9c3",tx:"#854d0e",l:"Consultor"}, distribuidor:{bg:"#d4edda",tx:"#155724",l:"Distribuidor"} };
  const r=map[role]||{bg:"#eee",tx:"#333",l:role};
  return <span style={{ background:r.bg, color:r.tx, fontSize:11, padding:"2px 8px", borderRadius:10, fontWeight:600 }}>{r.l}</span>;
}
function ProgressBar({ value, max, color="#00e07a" }) {
  const pct = max>0 ? Math.min(100,Math.round((value/max)*100)) : 0;
  return (
    <div style={{ background:"#e0e0e0", borderRadius:99, height:8, overflow:"hidden", flex:1 }}>
      <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:99, transition:"width 0.3s" }}/>
    </div>
  );
}
function LogoMark() {
  return (
    <div style={{ lineHeight:1.2 }}>
      <div style={{ display:"flex", alignItems:"baseline", gap:5 }}>
        <span style={{ color:"#fff", fontWeight:900, fontSize:20, letterSpacing:-0.5 }}>graduu</span>
        <span style={{ color:C.pink, fontWeight:700, fontSize:15 }}>+ parceiros</span>
      </div>
      <span style={{ color:"#ffffff88", fontSize:10, letterSpacing:0.5 }}>distribuidores UniFECAF</span>
    </div>
  );
}
function MetricCard({ label, val, sub, color }) {
  return (
    <div style={{ background:"#f4f4f8", borderRadius:8, padding:"1rem", borderLeft: color?`3px solid ${color}`:"none" }}>
      <p style={{ margin:"0 0 4px", fontSize:12, color:"#666" }}>{label}</p>
      <p style={{ margin:0, fontSize:20, fontWeight:600, color:color||"#111" }}>{val}</p>
      {sub&&<p style={{ margin:"2px 0 0", fontSize:11, color:"#888" }}>{sub}</p>}
    </div>
  );
}
function Modal({ children, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:14, padding:24, maxWidth:540, width:"100%", maxHeight:"90vh", overflowY:"auto", position:"relative" }}>
        {onClose&&<button onClick={onClose} style={{ position:"absolute", top:12, right:14, background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#aaa" }}>✕</button>}
        {children}
      </div>
    </div>
  );
}
function AppHeader({ session, logout, avisosBadge=0 }) {
  const roleLabel = { admin:"Super Admin", gestor:"Gestor de Polo", consultor:"Consultor de Parceiros" }[session?.role];
  return (
    <div style={{ background:`linear-gradient(135deg,${C.dark},${C.purple})`, padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <LogoMark/>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ color:"#fff", fontSize:12, opacity:0.8 }}>{session?.nome}</span>
        {roleLabel&&<span style={{ background:"#ffffff22", borderRadius:4, color:"#fff", fontSize:10, padding:"2px 7px" }}>{roleLabel}</span>}
        {avisosBadge>0&&<span style={{ background:C.danger, color:"#fff", borderRadius:10, fontSize:11, padding:"2px 8px", fontWeight:700 }}>🔔 {avisosBadge}</span>}
        <button onClick={logout} style={{ background:"none", border:"1px solid #ffffff44", borderRadius:6, color:"#fff", fontSize:12, padding:"4px 10px", cursor:"pointer" }}>Sair</button>
      </div>
    </div>
  );
}
function TabBar({ tabs, active, setActive }) {
  return (
    <div style={{ display:"flex", borderBottom:"1px solid #ddd", background:"#fff", padding:"0 16px", overflowX:"auto" }}>
      {tabs.map(([k,l,badge])=>(
        <button key={k} onClick={()=>setActive(k)} style={{ background:"none", border:"none", borderBottom:active===k?`2px solid ${C.green}`:"2px solid transparent", padding:"11px 14px", fontSize:13, cursor:"pointer", color:active===k?C.dark:"#666", fontWeight:active===k?700:400, whiteSpace:"nowrap" }}>
          {l}{badge>0&&<span style={{ background:C.danger, color:"#fff", borderRadius:10, fontSize:10, padding:"1px 5px", marginLeft:6 }}>{badge}</span>}
        </button>
      ))}
    </div>
  );
}
function MsgBanner({ msg }) {
  if (!msg) return null;
  const bg=msg.type==="error"?"#f8d7da":msg.type==="warn"?"#fff3cd":"#d4edda";
  const tx=msg.type==="error"?"#721c24":msg.type==="warn"?"#856404":"#155724";
  return <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background:bg, color:tx, padding:"10px 20px", borderRadius:8, fontSize:13, zIndex:999, boxShadow:"0 2px 8px #0002", maxWidth:420, textAlign:"center" }}>{msg.text}</div>;
}

// ── Busca de Polo ──
function PoloBusca({ onSelect }) {
  const [q,setQ]=useState(""); const [results,setResults]=useState([]); const [show,setShow]=useState(false);
  function handleChange(v) { setQ(v); setResults(searchPolos(v)); setShow(true); }
  function pick(p) { onSelect(p); setQ(""); setResults([]); setShow(false); }
  return (
    <div style={{ position:"relative" }}>
      <input value={q} onChange={e=>handleChange(e.target.value)} placeholder="Buscar polo por nome, cidade ou código..." style={iStyle} onFocus={()=>q.length>=2&&setShow(true)} onBlur={()=>setTimeout(()=>setShow(false),200)}/>
      {show&&results.length>0&&(
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #ddd", borderRadius:8, boxShadow:"0 4px 12px #0002", zIndex:50, maxHeight:240, overflowY:"auto" }}>
          {results.map(p=>(
            <div key={p.codigo} onMouseDown={()=>pick(p)} style={{ padding:"10px 14px", cursor:"pointer", borderBottom:"0.5px solid #f0f0f0", fontSize:13 }}>
              <span style={{ fontWeight:500 }}>{p.nome}</span>
              <span style={{ color:"#888", fontSize:11, marginLeft:8 }}>{p.cidade&&p.estado?`${p.cidade}/${p.estado} · `:""}{p.codigo}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Polos selecionados ──
function PolosSelector({ polosSelecionados, setPolosSelecionados, label="Polos de atuação" }) {
  function addPolo(p) {
    if (!polosSelecionados.find(x=>x.codigo===p.codigo)) setPolosSelecionados([...polosSelecionados,p]);
  }
  function removePolo(codigo) { setPolosSelecionados(polosSelecionados.filter(p=>p.codigo!==codigo)); }
  return (
    <div>
      <label style={lStyle}>{label}</label>
      <PoloBusca onSelect={addPolo}/>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8 }}>
        {polosSelecionados.map(p=>(
          <div key={p.codigo} style={{ background:"#eeeeff", border:`1px solid ${C.dark}22`, borderRadius:8, padding:"4px 10px", fontSize:12, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ color:C.dark, fontWeight:500 }}>{p.codigo}</span>
            <span style={{ color:"#666" }}>{p.nome.length>30?p.nome.slice(0,30)+"...":p.nome}</span>
            <button onClick={()=>removePolo(p.codigo)} style={{ background:"none", border:"none", cursor:"pointer", color:"#dc3545", fontSize:14, padding:0, lineHeight:1 }}>×</button>
          </div>
        ))}
        {polosSelecionados.length===0&&<p style={{ margin:0, fontSize:12, color:"#aaa" }}>Nenhum polo selecionado. Busque acima.</p>}
      </div>
    </div>
  );
}

// ── Avisos ──
function AvisosPanel({ session, data, upd, showMsg }) {
  const [titulo,setTitulo]=useState(""); const [corpo,setCorpo]=useState("");
  const [destinatarios,setDestinatarios]=useState({ gestor:false, consultor:false, distribuidor:false });
  const [especificos,setEspecificos]=useState([]);
  const [modoEsp,setModoEsp]=useState(false);
  const avisos=data.avisos||[];
  const meuId=session.id||"admin";
  const meuRole=session.role||"admin";

  const usuariosAlvo = (data.users||[]).filter(u=>{
    if(meuRole==="admin") return true;
    if(meuRole==="gestor"){
      const meusPolo=(session.polos||[]).map(p=>p.codigo);
      return (u.role==="consultor"&&Object.entries(u.vinculacoesGestor||{}).some(([gId,v])=>parseInt(gId)===meuId&&v.status==="aprovado"))
        ||(u.role==="distribuidor"&&u.polosSelecionados?.some(c=>meusPolo.includes(c)));
    }
    if(meuRole==="consultor"){
      const meusPolo=(session.polos||[]).map(p=>p.codigo);
      return u.role==="distribuidor"&&u.polosSelecionados?.some(c=>meusPolo.includes(c));
    }
    return false;
  });

  const meuAviso = avisos.filter(a=>{
    if(meuRole==="admin") return true;
    if(a.remetenteId===meuId) return true;
    if(a.destinatariosTodos?.includes(meuRole)) return true;
    if(a.destinatariosEsp?.includes(meuId)) return true;
    return false;
  });

  function enviar() {
    if(!titulo.trim()||!corpo.trim()){showMsg("Preencha título e corpo.","error");return;}
    const destTodos = Object.entries(destinatarios).filter(([,v])=>v).map(([k])=>k);
    if(!modoEsp&&destTodos.length===0){showMsg("Selecione ao menos um destinatário.","error");return;}
    if(modoEsp&&especificos.length===0){showMsg("Selecione ao menos um destinatário.","error");return;}
    const novo={id:Date.now(),titulo,corpo,remetenteId:meuId,remetenteNome:session.nome||"Admin",remetenteRole:meuRole,
      destinatariosTodos:modoEsp?[]:destTodos,destinatariosEsp:modoEsp?especificos:[],
      criadoEm:new Date().toLocaleString("pt-BR"),lidos:[]};
    upd({...data,avisos:[...(data.avisos||[]),novo]});
    setTitulo("");setCorpo("");setDestinatarios({gestor:false,consultor:false,distribuidor:false});setEspecificos([]);
    showMsg("Aviso enviado!");
  }

  function toggleEsp(id){setEspecificos(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);}

  return (
    <div>
      <div style={{ background:"#fff", border:"1px solid #e0e0e0", borderRadius:12, padding:20, marginBottom:20 }}>
        <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:500 }}>Novo aviso</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <Inp label="Título *" value={titulo} onChange={e=>setTitulo(e.target.value)}/>
          <div><label style={lStyle}>Mensagem *</label><textarea value={corpo} onChange={e=>setCorpo(e.target.value)} rows={3} style={{...iStyle,resize:"vertical"}}/></div>
          <div>
            <label style={lStyle}>Destinatários</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
              <button onClick={()=>setModoEsp(false)} style={{ padding:"5px 12px", borderRadius:6, fontSize:12, cursor:"pointer", border:"none", background:!modoEsp?C.dark:"#eee", color:!modoEsp?"#fff":"#333" }}>Por perfil</button>
              <button onClick={()=>setModoEsp(true)} style={{ padding:"5px 12px", borderRadius:6, fontSize:12, cursor:"pointer", border:"none", background:modoEsp?C.dark:"#eee", color:modoEsp?"#fff":"#333" }}>Específicos</button>
            </div>
            {!modoEsp&&<div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {meuRole==="admin"&&["gestor","consultor","distribuidor"].map(r=>(
                <label key={r} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, cursor:"pointer" }}>
                  <input type="checkbox" checked={destinatarios[r]} onChange={e=>setDestinatarios({...destinatarios,[r]:e.target.checked})} style={{ accentColor:C.dark }}/>
                  <RoleBadge role={r}/>
                </label>
              ))}
              {meuRole==="gestor"&&["consultor","distribuidor"].map(r=>(
                <label key={r} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, cursor:"pointer" }}>
                  <input type="checkbox" checked={destinatarios[r]} onChange={e=>setDestinatarios({...destinatarios,[r]:e.target.checked})} style={{ accentColor:C.dark }}/>
                  <RoleBadge role={r}/>
                </label>
              ))}
              {meuRole==="consultor"&&(
                <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, cursor:"pointer" }}>
                  <input type="checkbox" checked={destinatarios.distribuidor} onChange={e=>setDestinatarios({...destinatarios,distribuidor:e.target.checked})} style={{ accentColor:C.dark }}/>
                  <RoleBadge role="distribuidor"/>
                </label>
              )}
            </div>}
            {modoEsp&&<div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:180, overflowY:"auto" }}>
              {usuariosAlvo.map(u=>(
                <label key={u.id} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, cursor:"pointer", padding:"4px 8px", borderRadius:6, background:especificos.includes(u.id)?"#eeeeff":"transparent" }}>
                  <input type="checkbox" checked={especificos.includes(u.id)} onChange={()=>toggleEsp(u.id)} style={{ accentColor:C.dark }}/>
                  <span>{u.nome}</span><RoleBadge role={u.role}/>
                </label>
              ))}
            </div>}
          </div>
          <button onClick={enviar} style={{ ...btnP, alignSelf:"flex-start" }}>Enviar aviso</button>
        </div>
      </div>
      <h3 style={{ margin:"0 0 12px", fontSize:15, fontWeight:500 }}>Avisos ({meuAviso.length})</h3>
      {meuAviso.length===0&&<p style={{ color:"#aaa", fontSize:13 }}>Nenhum aviso ainda.</p>}
      {[...meuAviso].reverse().map(a=>(
        <div key={a.id} style={{ background:"#fff", border:"1px solid #e0e0e0", borderRadius:10, padding:"14px 16px", marginBottom:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:6 }}>
            <div>
              <p style={{ margin:"0 0 2px", fontWeight:600, fontSize:14 }}>{a.titulo}</p>
              <p style={{ margin:0, fontSize:11, color:"#888" }}>De: {a.remetenteNome} · {a.criadoEm}</p>
            </div>
            <RoleBadge role={a.remetenteRole}/>
          </div>
          <p style={{ margin:0, fontSize:13, color:"#444", lineHeight:1.6 }}>{a.corpo}</p>
        </div>
      ))}
    </div>
  );
}

// ── Materiais ──
function MateriaisAdmin({ data, upd, showMsg }) {
  const [titulo,setTitulo]=useState(""); const [tipo,setTipo]=useState(""); const [desc,setDesc]=useState(""); const [link,setLink]=useState("");
  const [visibi,setVisibi]=useState({ gestor:false, consultor:false, distribuidor:false });
  function salvar(){
    if(!titulo||!tipo||!desc||!link){showMsg("Preencha todos os campos.","error");return;}
    if(!visibi.gestor&&!visibi.consultor&&!visibi.distribuidor){showMsg("Selecione ao menos um perfil.","error");return;}
    const novo={id:Date.now(),titulo,tipo,desc,link,visibilidade:Object.entries(visibi).filter(([,v])=>v).map(([k])=>k),criadoEm:new Date().toLocaleDateString("pt-BR")};
    upd({...data,materiais:[...(data.materiais||[]),novo]});
    setTitulo("");setTipo("");setDesc("");setLink("");setVisibi({gestor:false,consultor:false,distribuidor:false});
    showMsg("Material cadastrado!");
  }
  function excluir(id){upd({...data,materiais:(data.materiais||[]).filter(m=>m.id!==id)});showMsg("Material removido.");}
  return (
    <div>
      <div style={{ background:"#fff", border:"1px solid #e0e0e0", borderRadius:12, padding:20, marginBottom:20 }}>
        <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:500 }}>Novo material</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <Inp label="Título *" value={titulo} onChange={e=>setTitulo(e.target.value)}/>
          <Sel label="Tipo *" value={tipo} onChange={e=>setTipo(e.target.value)} options={["Arte","Texto","Vídeo","Apresentação","Planilha","Outro"]}/>
          <Inp label="Descrição *" value={desc} onChange={e=>setDesc(e.target.value)}/>
          <Inp label="Link / URL *" value={link} onChange={e=>setLink(e.target.value)} placeholder="https://..."/>
          <div>
            <label style={lStyle}>Visível para *</label>
            <div style={{ display:"flex", gap:12 }}>
              {["gestor","consultor","distribuidor"].map(r=>(
                <label key={r} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, cursor:"pointer" }}>
                  <input type="checkbox" checked={visibi[r]} onChange={e=>setVisibi({...visibi,[r]:e.target.checked})} style={{ accentColor:C.dark }}/>
                  <RoleBadge role={r}/>
                </label>
              ))}
            </div>
          </div>
          <button onClick={salvar} style={{ ...btnP, alignSelf:"flex-start" }}>Cadastrar material</button>
        </div>
      </div>
      <h3 style={{ margin:"0 0 12px", fontSize:15, fontWeight:500 }}>Materiais cadastrados ({(data.materiais||[]).length})</h3>
      {(data.materiais||[]).map(m=>(
        <div key={m.id} style={{ background:"#fff", border:"1px solid #e0e0e0", borderRadius:10, padding:"12px 16px", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <span style={{ background:"#eeeeff", color:C.dark, fontSize:11, fontWeight:700, borderRadius:6, padding:"2px 7px" }}>{m.tipo}</span>
              <p style={{ margin:0, fontWeight:500, fontSize:14 }}>{m.titulo}</p>
            </div>
            <p style={{ margin:"0 0 4px", fontSize:12, color:"#666" }}>{m.desc}</p>
            <div style={{ display:"flex", gap:6 }}>{(m.visibilidade||[]).map(r=><RoleBadge key={r} role={r}/>)}</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <a href={m.link} target="_blank" rel="noreferrer" style={{ background:`linear-gradient(135deg,${C.dark},${C.purple})`, color:"#fff", borderRadius:6, padding:"5px 12px", fontSize:12, textDecoration:"none" }}>Acessar</a>
            <button onClick={()=>excluir(m.id)} style={{ background:"none", border:"1px solid #dc3545", borderRadius:6, padding:"5px 10px", fontSize:12, cursor:"pointer", color:"#dc3545" }}>Excluir</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MateriaisView({ role, materiais=[] }) {
  const visiveis=materiais.filter(m=>(m.visibilidade||[]).includes(role));
  if(visiveis.length===0) return <p style={{ color:"#aaa", fontSize:13 }}>Nenhum material disponível para o seu perfil.</p>;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {visiveis.map(m=>(
        <div key={m.id} style={{ background:"#fff", border:"1px solid #e0e0e0", borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ background:"#eeeeff", borderRadius:8, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ fontSize:11, fontWeight:700, color:C.dark }}>{m.tipo.slice(0,3).toUpperCase()}</span>
            </div>
            <div><p style={{ margin:0, fontSize:13, fontWeight:500 }}>{m.titulo}</p><p style={{ margin:0, fontSize:12, color:"#666" }}>{m.desc}</p></div>
          </div>
          <a href={m.link} target="_blank" rel="noreferrer" style={{ background:`linear-gradient(135deg,${C.dark},${C.purple})`, color:"#fff", borderRadius:6, padding:"5px 12px", fontSize:12, textDecoration:"none", whiteSpace:"nowrap" }}>Acessar</a>
        </div>
      ))}
    </div>
  );
}

// ── Metas ──
function MetasGestor({ session, data, upd, showMsg }) {
  const mes=getMes();
  const metas=data.metas||{};
  const consultores=(data.users||[]).filter(u=>{
    if(u.role!=="consultor")return false;
    return Object.entries(u.vinculacoesGestor||{}).some(([gId,v])=>parseInt(gId)===session.id&&v.status==="aprovado");
  });

  function setMetaConsultor(cId,val){
    const nm={...metas,[`${mes}_c_${cId}`]:parseInt(val)||0};
    upd({...data,metas:nm});
  }

  return (
    <div>
      <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:500 }}>Metas — {mes}</h3>
      {consultores.length===0&&<p style={{ color:"#aaa", fontSize:13 }}>Nenhum consultor vinculado ainda.</p>}
      {consultores.map(c=>{
        const metaC=metas[`${mes}_c_${c.id}`]||0;
        const distribuidores=(data.users||[]).filter(u=>u.role==="distribuidor"&&u.polosSelecionados?.some(p=>(c.polos||[]).map(x=>x.codigo).includes(p)));
        const qtdDist=distribuidores.length||1;
        const metaAutoDiv=metaC>0?Math.floor(metaC/qtdDist):0;
        const realizadoC=(data.leads||[]).filter(l=>distribuidores.some(d=>d.id===l.parceiroId)&&["Matrícula concluída","Adesão paga","Comissão liberada","Comissão paga"].includes(l.status)&&l.criadoEm?.includes(mes.split("-")[1])).length;
        const {pace,percentPace,percentReal}=calcForecast(realizadoC,metaC);
        return (
          <div key={c.id} style={{ background:"#fff", border:"1px solid #e0e0e0", borderRadius:12, padding:"16px", marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div><p style={{ margin:"0 0 2px", fontWeight:600, fontSize:15 }}>{c.nome}</p><p style={{ margin:0, fontSize:12, color:"#666" }}>{distribuidores.length} distribuidor(es)</p></div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <label style={lStyle}>Meta:</label>
                <input type="number" value={metaC} min={0} onChange={e=>setMetaConsultor(c.id,e.target.value)} style={{ ...iStyle, width:80, textAlign:"center" }}/>
              </div>
            </div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:12 }}>
              <MetricCard label="Realizado" val={realizadoC} color="#155724"/>
              <MetricCard label="Pace (proj.)" val={pace} sub={`${percentPace}% da meta`} color={pace>=metaC?"#155724":C.warn}/>
              <MetricCard label="Meta" val={metaC}/>
              <MetricCard label="Meta/dist." val={metaAutoDiv} sub="divisão automática"/>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12, color:"#666", whiteSpace:"nowrap" }}>Progresso: {realizadoC}/{metaC}</span>
              <ProgressBar value={realizadoC} max={metaC} color={percentReal>=100?"#155724":percentReal>=70?C.green:C.warn}/>
              <span style={{ fontSize:12, fontWeight:600, color:"#333" }}>{percentReal}%</span>
            </div>
            {distribuidores.length>0&&<div style={{ marginTop:14 }}>
              <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:500, color:"#555" }}>Metas individuais dos distribuidores</p>
              {distribuidores.map(d=>{
                const metaD=metas[`${mes}_d_${d.id}`]??metaAutoDiv;
                const realD=(data.leads||[]).filter(l=>l.parceiroId===d.id&&["Matrícula concluída","Adesão paga","Comissão liberada","Comissão paga"].includes(l.status)).length;
                return(
                  <div key={d.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderTop:"0.5px solid #f0f0f0" }}>
                    <span style={{ fontSize:13, minWidth:140 }}>{d.nome}</span>
                    <ProgressBar value={realD} max={metaD} color={realD>=metaD?"#155724":C.green}/>
                    <span style={{ fontSize:12, color:"#666", whiteSpace:"nowrap" }}>{realD}/{metaD}</span>
                    <input type="number" value={metaD} min={0} onChange={e=>{const nm={...metas,[`${mes}_d_${d.id}`]:parseInt(e.target.value)||0};upd({...data,metas:nm});}} style={{ width:60, padding:"4px 6px", borderRadius:6, border:"1px solid #ccc", fontSize:12, textAlign:"center" }}/>
                  </div>
                );
              })}
            </div>}
          </div>
        );
      })}
    </div>
  );
}

function MetasConsultor({ session, data, upd }) {
  const mes=getMes();
  const metas=data.metas||{};
  const metaC=metas[`${mes}_c_${session.id}`]||0;
  const meusPolo=(session.polos||[]).map(p=>p.codigo);
  const distribuidores=(data.users||[]).filter(u=>u.role==="distribuidor"&&u.polosSelecionados?.some(c=>meusPolo.includes(c)));
  const qtdDist=distribuidores.length||1;
  const metaAutoDiv=metaC>0?Math.floor(metaC/qtdDist):0;
  const realizado=(data.leads||[]).filter(l=>distribuidores.some(d=>d.id===l.parceiroId)&&["Matrícula concluída","Adesão paga","Comissão liberada","Comissão paga"].includes(l.status)).length;
  const {pace,percentPace,percentReal}=calcForecast(realizado,metaC);

  return (
    <div>
      <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:500 }}>Minha meta — {mes}</h3>
      <div style={{ background:"#fff", border:"1px solid #e0e0e0", borderRadius:12, padding:16, marginBottom:20 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:14 }}>
          <MetricCard label="Meta do mês" val={metaC}/>
          <MetricCard label="Realizado" val={realizado} color="#155724"/>
          <MetricCard label="Pace" val={pace} sub={`${percentPace}% da meta`} color={pace>=metaC?"#155724":C.warn}/>
          <MetricCard label="Forecast" val={`${percentReal}%`} color={percentReal>=100?"#155724":percentReal>=70?C.green:C.warn}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <ProgressBar value={realizado} max={metaC} color={percentReal>=100?"#155724":percentReal>=70?C.green:C.warn}/>
          <span style={{ fontSize:13, fontWeight:600 }}>{percentReal}%</span>
        </div>
      </div>
      <h3 style={{ margin:"0 0 12px", fontSize:15, fontWeight:500 }}>Metas dos distribuidores</h3>
      {distribuidores.map(d=>{
        const metaD=metas[`${mes}_d_${d.id}`]??metaAutoDiv;
        const realD=(data.leads||[]).filter(l=>l.parceiroId===d.id&&["Matrícula concluída","Adesão paga","Comissão liberada","Comissão paga"].includes(l.status)).length;
        const pctD=metaD>0?Math.round((realD/metaD)*100):0;
        const paceD=calcPace(realD);
        return(
          <div key={d.id} style={{ background:"#fff", border:"1px solid #e0e0e0", borderRadius:10, padding:"14px 16px", marginBottom:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div><p style={{ margin:"0 0 2px", fontWeight:500, fontSize:14 }}>{d.nome}</p><p style={{ margin:0, fontSize:11, color:"#888" }}>Pace: {paceD} | Forecast: {pctD}%</p></div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:12, color:"#666" }}>Meta:</span>
                <input type="number" value={metaD} min={0} onChange={e=>{const nm={...metas,[`${mes}_d_${d.id}`]:parseInt(e.target.value)||0};upd({...data,metas:nm});}} style={{ width:60, padding:"4px 6px", borderRadius:6, border:"1px solid #ccc", fontSize:12, textAlign:"center" }}/>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <ProgressBar value={realD} max={metaD} color={realD>=metaD?"#155724":C.green}/>
              <span style={{ fontSize:12, fontWeight:600 }}>{realD}/{metaD}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Dashboard Distribuidor ──
function DashboardDistribuidor({ session, data }) {
  const mes=getMes(); const metas=data.metas||{};
  const metaD=metas[`${mes}_d_${session.id}`]||0;
  const myLeads=(data.leads||[]).filter(l=>l.parceiroId===session.id);
  const matriks=myLeads.filter(l=>["Matrícula concluída","Adesão paga","Comissão liberada","Comissão paga"].includes(l.status));
  const pago=myLeads.filter(l=>l.status==="Comissão paga").length*174.30;
  const prev=myLeads.filter(l=>l.status==="Comissão liberada").length*174.30;
  const {pace,percentPace,percentReal}=calcForecast(matriks.length,metaD);
  const semanas=[0,1,2,3].map(s=>{
    const diasSem=myLeads.filter(l=>{if(!l.criadoEm)return false;const p=l.criadoEm.split("/");if(p.length<3)return false;const d=new Date(`${p[2]}-${p[1]}-${p[0]}`);const dom=new Date();dom.setDate(dom.getDate()-dom.getDay()-s*7);const fim=new Date(dom);fim.setDate(fim.getDate()+6);return d>=dom&&d<=fim;});
    return {sem:`-${s}sem`,qtd:diasSem.length};
  }).reverse();

  return (
    <div>
      <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:600 }}>Meu dashboard — {mes}</h3>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10, marginBottom:20 }}>
        <MetricCard label="Leads totais" val={myLeads.length}/>
        <MetricCard label="Matrículas" val={matriks.length} color="#155724"/>
        <MetricCard label="Meta do mês" val={metaD}/>
        <MetricCard label="Comissão prevista" val={`R$ ${prev.toFixed(2)}`} color={C.dark}/>
        <MetricCard label="Total recebido" val={`R$ ${pago.toFixed(2)}`} color="#155724"/>
      </div>

      {metaD>0&&<div style={{ background:"#fff", border:"1px solid #e0e0e0", borderRadius:12, padding:16, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <p style={{ margin:0, fontWeight:500, fontSize:14 }}>Progresso da meta</p>
          <span style={{ fontSize:13, fontWeight:700, color:percentReal>=100?"#155724":C.dark }}>{matriks.length}/{metaD} ({percentReal}%)</span>
        </div>
        <ProgressBar value={matriks.length} max={metaD} color={percentReal>=100?"#155724":percentReal>=70?C.green:C.warn}/>
        <div style={{ display:"flex", gap:16, marginTop:10 }}>
          <p style={{ margin:0, fontSize:12, color:"#666" }}>Pace semanal: <strong>{pace}</strong> ({percentPace}% da meta)</p>
          <p style={{ margin:0, fontSize:12, color:"#666" }}>Forecast: <strong>{percentReal}%</strong></p>
        </div>
      </div>}

      <div style={{ background:"#fff", border:"1px solid #e0e0e0", borderRadius:12, padding:16, marginBottom:16 }}>
        <p style={{ margin:"0 0 12px", fontWeight:500, fontSize:14 }}>Evolução semanal (leads)</p>
        <div style={{ display:"flex", gap:8, alignItems:"flex-end", height:80 }}>
          {semanas.map((s,i)=>{
            const maxV=Math.max(...semanas.map(x=>x.qtd),1);
            const h=maxV>0?Math.round((s.qtd/maxV)*64):4;
            return(
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <span style={{ fontSize:11, fontWeight:600, color:"#333" }}>{s.qtd}</span>
                <div style={{ width:"100%", height:h, background:`linear-gradient(135deg,${C.dark},${C.purple})`, borderRadius:"4px 4px 0 0", minHeight:4 }}/>
                <span style={{ fontSize:10, color:"#888" }}>{s.sem}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background:"#fff", border:"1px solid #e0e0e0", borderRadius:12, padding:16 }}>
        <p style={{ margin:"0 0 12px", fontWeight:500, fontSize:14 }}>Pipeline de leads</p>
        {STATUS_PIPELINE.map(s=>{
          const qtd=myLeads.filter(l=>l.status===s).length;
          return(
            <div key={s} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <Badge status={s}/>
              <ProgressBar value={qtd} max={Math.max(myLeads.length,1)} color={STATUS_BG[s]}/>
              <span style={{ fontSize:12, fontWeight:600, minWidth:20 }}>{qtd}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Storage ──
function useStorage() {
  const [data,setData]=useState(null);
  useEffect(()=>{loadData().then(d=>setData({users:[],leads:[],avisos:[],materiais:[],metas:[],...d}));},[]);
  function upd(nd){setData(nd);saveData(nd);}
  return {data,upd};
}

// ── Hook mover lead ──
function useMoverLead(data,upd) {
  const [pendente,setPendente]=useState(null);
  const [modalDados,setModalDados]=useState(null);
  const [modalMatricula,setModalMatricula]=useState(null);
  function tentar(lead,novoStatus,showMsg){
    if(novoStatus===lead.status)return;
    const idxNovo=STATUS_PIPELINE.indexOf(novoStatus);
    const idxMatI=STATUS_PIPELINE.indexOf("Matrícula iniciada");
    const idxMatC=STATUS_PIPELINE.indexOf("Matrícula concluída");
    if(idxNovo>=idxMatI&&!dadosCandidatoCompletos(lead)){setPendente({lead,novoStatus,showMsg});setModalDados(lead);return;}
    if(idxNovo===idxMatC&&!matriculaConfirmada(lead)){setPendente({lead,novoStatus,showMsg});setModalMatricula(lead);return;}
    if(idxNovo>idxMatC&&!matriculaConfirmada(lead)){showMsg?.("Confirme o tipo de matrícula antes de avançar.","error");return;}
    mover(lead.id,novoStatus,{},showMsg);
  }
  function mover(id,status,extra,showMsg){
    const leads=(data.leads||[]).map(l=>l.id===id?{...l,status,...extra}:l);
    upd({...data,leads});showMsg?.(`Status: "${status}"`);
  }
  function salvarDados(dadosCandidato){
    if(!pendente)return;
    const leads=(data.leads||[]).map(l=>l.id===pendente.lead.id?{...l,dadosCandidato,status:pendente.novoStatus}:l);
    upd({...data,leads});pendente.showMsg?.(`Status: "${pendente.novoStatus}"`);
    setModalDados(null);setPendente(null);
  }
  function salvarMatricula(info){
    if(!pendente)return;
    const leads=(data.leads||[]).map(l=>l.id===pendente.lead.id?{...l,...info,status:pendente.novoStatus}:l);
    upd({...data,leads});pendente.showMsg?.(info.tipoMatricula==="virtual"?"Matrícula virtual registrada!":"Contrato enviado!");
    setModalMatricula(null);setPendente(null);
  }
  return {tentar,modalDados,setModalDados,salvarDados,modalMatricula,setModalMatricula,salvarMatricula};
}

function ModalDadosCandidato({lead,onSave,onClose}){
  const d=lead.dadosCandidato||{};
  const [f,setF]=useState({nomeCompleto:d.nomeCompleto||"",cpf:d.cpf||"",rg:d.rg||"",nascimento:d.nascimento||"",email:d.email||"",telefone:d.telefone||"",endereco:d.endereco||"",estadoCivil:d.estadoCivil||""});
  function salvar(){if(!["nomeCompleto","cpf","rg","nascimento","email","telefone","endereco","estadoCivil"].every(k=>f[k]?.trim())){alert("Preencha todos os campos.");return;}onSave(f);}
  return(
    <Modal onClose={onClose}>
      <h3 style={{margin:"0 0 6px",fontSize:16,fontWeight:600}}>Dados do candidato</h3>
      <p style={{margin:"0 0 16px",fontSize:13,color:"#666"}}>Preencha todos os dados para avançar para <strong>Matrícula iniciada</strong>.</p>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Inp label="Nome completo *" value={f.nomeCompleto} onChange={e=>setF({...f,nomeCompleto:e.target.value})}/>
        <Inp label="CPF *" value={f.cpf} onChange={e=>setF({...f,cpf:e.target.value})}/>
        <Inp label="RG *" value={f.rg} onChange={e=>setF({...f,rg:e.target.value})}/>
        <Inp label="Data de nascimento *" value={f.nascimento} onChange={e=>setF({...f,nascimento:e.target.value})} type="date"/>
        <Inp label="E-mail *" value={f.email} onChange={e=>setF({...f,email:e.target.value})} type="email"/>
        <Inp label="Telefone *" value={f.telefone} onChange={e=>setF({...f,telefone:e.target.value})} type="tel"/>
        <Inp label="Endereço completo *" value={f.endereco} onChange={e=>setF({...f,endereco:e.target.value})}/>
        <Sel label="Estado civil *" value={f.estadoCivil} onChange={e=>setF({...f,estadoCivil:e.target.value})} options={["Solteiro(a)","Casado(a)","Divorciado(a)","Viúvo(a)","União estável"]}/>
      </div>
      <div style={{display:"flex",gap:8,marginTop:16}}>
        <button onClick={salvar} style={{...btnP,flex:1}}>Salvar e avançar</button>
        <button onClick={onClose} style={{flex:1,background:"none",border:"1px solid #ccc",borderRadius:8,padding:"10px",fontSize:13,cursor:"pointer",color:"#666"}}>Cancelar</button>
      </div>
    </Modal>
  );
}
function ModalMatriculaConcluida({lead,onSave,onClose}){
  const [step,setStep]=useState(1);const [tipo,setTipo]=useState("");const [arquivo,setArquivo]=useState(null);const [nomeArquivo,setNomeArquivo]=useState("");
  const fileRef=useRef();
  function handleFile(e){const file=e.target.files[0];if(!file)return;if(file.size>3*1024*1024){alert("Máximo 3MB.");return;}const r=new FileReader();r.onload=ev=>{setArquivo(ev.target.result);setNomeArquivo(file.name);};r.readAsDataURL(file);}
  return(
    <Modal onClose={onClose}>
      {step===1&&<>
        <h3 style={{margin:"0 0 6px",fontSize:16,fontWeight:600}}>Confirmar matrícula</h3>
        <p style={{margin:"0 0 20px",fontSize:13,color:"#666"}}>Como a matrícula foi realizada?</p>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[["virtual","Virtual (sistema online)"],["fisica","Física (contrato impresso)"]].map(([v,l])=>(
            <label key={v} style={{display:"flex",alignItems:"center",gap:12,border:`1.5px solid ${tipo===v?C.dark:"#ccc"}`,borderRadius:10,padding:"14px 16px",cursor:"pointer",background:tipo===v?"#eeeeff":"#fff"}}>
              <input type="radio" name="tipo" value={v} checked={tipo===v} onChange={()=>setTipo(v)} style={{width:16,height:16,accentColor:C.dark}}/>
              <span style={{fontSize:14,fontWeight:tipo===v?600:400}}>{l}</span>
            </label>
          ))}
        </div>
        {tipo==="virtual"&&<div style={{background:"#e0e7ff",border:"1px solid #a5b4fc",borderRadius:8,padding:"10px 12px",marginTop:14}}><p style={{margin:0,fontSize:12,color:"#3730a3"}}>Uma tarefa será criada para o Admin confirmar a matrícula.</p></div>}
        <div style={{display:"flex",gap:8,marginTop:20}}>
          <button onClick={()=>{if(!tipo){alert("Selecione o tipo.");return;}if(tipo==="fisica"){setStep(2);return;}onSave({tipoMatricula:"virtual",tarefaAdmin:true});}} style={{...btnP,flex:1}}>Confirmar</button>
          <button onClick={onClose} style={{flex:1,background:"none",border:"1px solid #ccc",borderRadius:8,padding:"10px",fontSize:13,cursor:"pointer",color:"#666"}}>Cancelar</button>
        </div>
      </>}
      {step===2&&<>
        <h3 style={{margin:"0 0 6px",fontSize:16,fontWeight:600}}>Upload do contrato</h3>
        <div onClick={()=>fileRef.current.click()} style={{border:"2px dashed #ccc",borderRadius:10,padding:"32px 20px",textAlign:"center",cursor:"pointer",background:"#f9f9f9",marginBottom:14}}>
          {nomeArquivo?<div><p style={{margin:"0 0 4px",fontSize:14,fontWeight:500,color:C.dark}}>{nomeArquivo}</p><p style={{margin:0,fontSize:12,color:"#888"}}>Clique para substituir</p></div>
          :<div><p style={{margin:"0 0 4px",fontSize:32}}>📎</p><p style={{margin:0,fontSize:14,color:"#555"}}>Clique para selecionar · JPG, PNG ou PDF (máx. 3MB)</p></div>}
        </div>
        <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFile} style={{display:"none"}}/>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{if(!arquivo){alert("Faça o upload.");return;}onSave({tipoMatricula:"fisica",contratoArquivo:arquivo,contratoNome:nomeArquivo});}} style={{...btnP,flex:1}}>Enviar e confirmar</button>
          <button onClick={()=>setStep(1)} style={{flex:1,background:"none",border:"1px solid #ccc",borderRadius:8,padding:"10px",fontSize:13,cursor:"pointer",color:"#666"}}>Voltar</button>
        </div>
      </>}
    </Modal>
  );
}

// ── Kanban ──
function LeadForm({form,setForm,onSubmit,onCancel}){
  return(
    <div style={{background:"#fff",border:"1px solid #ddd",borderRadius:12,padding:20,marginBottom:20}}>
      <h4 style={{margin:"0 0 14px",fontSize:14,fontWeight:500}}>Cadastrar novo lead</h4>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Inp label="Nome *" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/>
        <Inp label="Telefone *" value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})} type="tel"/>
        <Inp label="Cidade *" value={form.cidade} onChange={e=>setForm({...form,cidade:e.target.value})}/>
        <div><label style={lStyle}>Modalidade *</label>
          <select value={form.modalidade} onChange={e=>setForm({...form,modalidade:e.target.value})} style={iStyle}>
            <option value="">Selecione...</option>
            {["EAD","Semipresencial","Pós-Graduação"].map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
        <div style={{gridColumn:"1/-1"}}><Inp label="Curso *" value={form.curso} onChange={e=>setForm({...form,curso:e.target.value})}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={lStyle}>Observações</label><textarea value={form.obs} onChange={e=>setForm({...form,obs:e.target.value})} rows={2} style={{...iStyle,resize:"vertical"}}/></div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:14}}>
        <button onClick={onSubmit} style={{background:`linear-gradient(135deg,${C.dark},${C.purple})`,color:"#fff",border:"none",borderRadius:7,padding:"8px 20px",fontSize:13,cursor:"pointer",fontWeight:500}}>Salvar</button>
        <button onClick={onCancel} style={{background:"none",border:"1px solid #ccc",borderRadius:7,padding:"8px 14px",fontSize:13,cursor:"pointer",color:"#666"}}>Cancelar</button>
      </div>
    </div>
  );
}
function KanbanLeads({leads,onAdd,showForm,leadForm,setLeadForm,onSubmit,onCancel,onMove}){
  const [dragging,setDragging]=useState(null);const [overCol,setOverCol]=useState(null);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:500}}>Meus leads ({leads.length})</h3>
        <button onClick={onAdd} style={{background:`linear-gradient(135deg,${C.dark},${C.purple})`,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,cursor:"pointer",fontWeight:500}}>+ Novo lead</button>
      </div>
      {showForm&&<LeadForm form={leadForm} setForm={setLeadForm} onSubmit={onSubmit} onCancel={onCancel}/>}
      {leads.length===0&&!showForm&&<p style={{color:"#aaa",fontSize:13}}>Nenhum lead ainda.</p>}
      <div style={{overflowX:"auto",paddingBottom:12}}>
        <div style={{display:"flex",gap:10,minWidth:KANBAN_COLS.length*190+"px"}}>
          {KANBAN_COLS.map(col=>{
            const colLeads=leads.filter(l=>l.status===col.key);const isOver=overCol===col.key;
            return(
              <div key={col.key} onDragOver={e=>{e.preventDefault();setOverCol(col.key);}} onDrop={e=>{e.preventDefault();if(dragging&&dragging.status!==col.key)onMove(dragging,col.key);setDragging(null);setOverCol(null);}}
                style={{flex:"0 0 180px",background:isOver?col.border+"55":col.color,border:`1.5px solid ${isOver?col.border:col.border+"99"}`,borderRadius:10,padding:"10px 8px",minHeight:300,transition:"background 0.15s"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <p style={{margin:0,fontSize:11,fontWeight:700,color:col.text}}>{col.key}</p>
                  <span style={{background:col.border,color:col.text,fontSize:10,fontWeight:700,borderRadius:10,padding:"1px 6px"}}>{colLeads.length}</span>
                </div>
                {colLeads.map(lead=>(
                  <div key={lead.id} draggable onDragStart={e=>{setDragging(lead);e.dataTransfer.effectAllowed="move";}} onDragEnd={()=>{setDragging(null);setOverCol(null);}}
                    style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:8,padding:"9px 10px",cursor:"grab",opacity:dragging?.id===lead.id?0.4:1,marginBottom:7,userSelect:"none"}}>
                    <p style={{margin:"0 0 2px",fontSize:12,fontWeight:600}}>{lead.nome}</p>
                    <p style={{margin:"0 0 2px",fontSize:11,color:"#666"}}>{lead.modalidade}</p>
                    <p style={{margin:0,fontSize:11,color:"#999",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead.curso}</p>
                    {lead.tipoMatricula&&<p style={{margin:"4px 0 0",fontSize:10,color:"#3730a3",fontWeight:600}}>📋 {lead.tipoMatricula==="virtual"?"Virtual":"Física"}</p>}
                  </div>
                ))}
                {isOver&&dragging&&dragging.status!==col.key&&<div style={{border:`2px dashed ${col.border}`,borderRadius:8,height:60,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:11,color:col.text}}>Soltar aqui</span></div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Register screens ──
function RegisterBase({onBack,titulo,steps,children}){
  const [step,setStep]=useState(1);
  const bar=<div style={{display:"flex",gap:6,marginTop:8}}>{steps.map(n=><div key={n} style={{flex:1,height:3,borderRadius:2,background:n<=step?`linear-gradient(90deg,${C.dark},${C.purple})`:"#ddd"}}/>)}</div>;
  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",background:"#f2f2f7",padding:20}}>
      <div style={{width:"100%",maxWidth:480,background:"#fff",border:"1px solid #e0e0e0",borderRadius:16,padding:"28px 24px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <button onClick={()=>step>1?setStep(step-1):onBack()} style={{background:"none",border:"none",cursor:"pointer",color:"#666",fontSize:22,padding:0}}>←</button>
          <div style={{flex:1}}><h2 style={{margin:0,fontSize:16,fontWeight:500}}>{titulo}</h2>{bar}<p style={{margin:"4px 0 0",fontSize:11,color:"#999"}}>Etapa {step} de {steps.length}</p></div>
        </div>
        {children(step,setStep)}
      </div>
    </div>
  );
}

function RegisterGestorScreen({onBack,onDone,showMsg}){
  const [nome,setNome]=useState("");const [email,setEmail]=useState("");const [telefone,setTelefone]=useState("");const [cpfCnpj,setCpfCnpj]=useState("");
  const [senha,setSenha]=useState("");const [confirmSenha,setConfirmSenha]=useState("");
  const [polosSel,setPolosSel]=useState([]);
  return(
    <RegisterBase onBack={onBack} titulo="Cadastro de Gestor de Polo" steps={[1,2,3]}>
      {(step,setStep)=><>
        {step===1&&<div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <Inp label="Nome completo *" value={nome} onChange={e=>setNome(e.target.value)}/>
          <div>
            <Inp label="E-mail institucional *" value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="seu@fecaf.com.br"/>
            {email&&!email.endsWith("@fecaf.com.br")&&<p style={{margin:"4px 0 0",fontSize:12,color:"#dc3545"}}>O e-mail deve ter extensão @fecaf.com.br</p>}
          </div>
          <Inp label="Telefone *" value={telefone} onChange={e=>setTelefone(e.target.value)} type="tel"/>
          <Inp label="CPF ou CNPJ *" value={cpfCnpj} onChange={e=>setCpfCnpj(e.target.value)}/>
          <button onClick={()=>{if(!nome||!email||!telefone||!cpfCnpj){showMsg("Preencha todos os campos.","error");return;}if(!email.endsWith("@fecaf.com.br")){showMsg("E-mail deve ter extensão @fecaf.com.br","error");return;}setStep(2);}} style={{...btnP,marginTop:4}}>Continuar</button>
        </div>}
        {step===2&&<div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <PolosSelector polosSelecionados={polosSel} setPolosSelecionados={setPolosSel} label="Polos que você gerencia *"/>
          <button onClick={()=>{if(polosSel.length===0){showMsg("Selecione ao menos um polo.","error");return;}setStep(3);}} style={{...btnP,marginTop:4}}>Continuar</button>
        </div>}
        {step===3&&<div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <Inp label="Senha *" value={senha} onChange={e=>setSenha(e.target.value)} type="password"/>
          <Inp label="Confirme a senha *" value={confirmSenha} onChange={e=>setConfirmSenha(e.target.value)} type="password"/>
          <div style={{background:"#e0e7ff",border:"1px solid #a5b4fc",borderRadius:8,padding:"10px 12px"}}><p style={{margin:0,fontSize:12,color:"#3730a3",lineHeight:1.6}}>Seu cadastro será analisado pelo Super Admin.</p></div>
          <button onClick={()=>{if(!senha||!confirmSenha){showMsg("Crie uma senha.","error");return;}if(senha!==confirmSenha){showMsg("As senhas não coincidem.","error");return;}onDone({nome,email,telefone,cpfCnpj,senha,polos:polosSel,role:"gestor",status:"pendente",criadoEm:new Date().toLocaleDateString("pt-BR")});}} style={{...btnP,marginTop:4}}>Enviar cadastro</button>
        </div>}
      </>}
    </RegisterBase>
  );
}

function RegisterConsultorScreen({onBack,onDone,showMsg}){
  const [nome,setNome]=useState("");const [email,setEmail]=useState("");const [telefone,setTelefone]=useState("");const [cpfCnpj,setCpfCnpj]=useState("");const [cidade,setCidade]=useState("");const [estado,setEstado]=useState("");
  const [senha,setSenha]=useState("");const [confirmSenha,setConfirmSenha]=useState("");const [accepted,setAccepted]=useState(false);
  const [polosSel,setPolosSel]=useState([]);
  return(
    <RegisterBase onBack={onBack} titulo="Cadastro de Consultor de Parceiros" steps={[1,2,3]}>
      {(step,setStep)=><>
        {step===1&&<div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <Inp label="Nome completo *" value={nome} onChange={e=>setNome(e.target.value)}/>
          <Inp label="E-mail *" value={email} onChange={e=>setEmail(e.target.value)} type="email"/>
          <Inp label="Telefone *" value={telefone} onChange={e=>setTelefone(e.target.value)} type="tel"/>
          <Inp label="CPF ou CNPJ *" value={cpfCnpj} onChange={e=>setCpfCnpj(e.target.value)}/>
          <Inp label="Cidade *" value={cidade} onChange={e=>setCidade(e.target.value)}/>
          <Sel label="Estado *" value={estado} onChange={e=>setEstado(e.target.value)} options={ESTADOS}/>
          <button onClick={()=>{if(!nome||!email||!telefone||!cpfCnpj||!cidade||!estado){showMsg("Preencha todos os campos.","error");return;}setStep(2);}} style={{...btnP,marginTop:4}}>Continuar</button>
        </div>}
        {step===2&&<div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <PolosSelector polosSelecionados={polosSel} setPolosSelecionados={setPolosSel} label="Polos de atuação *"/>
          <button onClick={()=>{if(polosSel.length===0){showMsg("Selecione ao menos um polo.","error");return;}setStep(3);}} style={{...btnP,marginTop:4}}>Continuar</button>
        </div>}
        {step===3&&<div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <Inp label="Crie uma senha *" value={senha} onChange={e=>setSenha(e.target.value)} type="password"/>
          <Inp label="Confirme a senha *" value={confirmSenha} onChange={e=>setConfirmSenha(e.target.value)} type="password"/>
          <div style={{background:"#f8f8f8",border:"1.5px solid #ccc",borderRadius:8,padding:12,maxHeight:160,overflowY:"auto"}}>
            <p style={{margin:"0 0 8px",fontSize:12,fontWeight:600}}>Contrato de Adesão</p>
            <pre style={{fontSize:11,lineHeight:1.7,color:"#555",whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{CONTRACT_TEXT}</pre>
          </div>
          <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",background:accepted?"#d4edda":"#f8f8f8",border:`1.5px solid ${accepted?"#a3d9a5":"#ccc"}`,borderRadius:8,padding:12}}>
            <input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} style={{width:16,height:16,marginTop:1,flexShrink:0,accentColor:C.dark,cursor:"pointer"}}/>
            <span style={{fontSize:13,lineHeight:1.5}}>Li e aceito o contrato de adesão</span>
          </label>
          <button onClick={()=>{if(!senha||!confirmSenha){showMsg("Crie uma senha.","error");return;}if(senha!==confirmSenha){showMsg("As senhas não coincidem.","error");return;}if(!accepted){showMsg("Aceite o contrato.","error");return;}onDone({nome,email,telefone,cpfCnpj,cidade,estado,senha,polos:polosSel,role:"consultor",status:"pendente",vinculacoesGestor:{},criadoEm:new Date().toLocaleDateString("pt-BR")});}} style={{...btnP,marginTop:4}}>Enviar cadastro</button>
        </div>}
      </>}
    </RegisterBase>
  );
}

function RegisterScreen({onBack,onDone,showMsg}){
  const [nome,setNome]=useState("");const [email,setEmail]=useState("");const [telefone,setTelefone]=useState("");
  const [nascimento,setNascimento]=useState("");const [cpfCnpj,setCpfCnpj]=useState("");const [endereco,setEndereco]=useState("");
  const [pixP,setPixP]=useState("");const [pixS,setPixS]=useState("");const [canal,setCanal]=useState("");
  const [senha,setSenha]=useState("");const [confirmSenha,setConfirmSenha]=useState("");const [accepted,setAccepted]=useState(false);
  const [polosSel,setPolosSel]=useState([]);
  return(
    <RegisterBase onBack={onBack} titulo="Cadastro de Distribuidor" steps={[1,2,3,4]}>
      {(step,setStep)=><>
        {step===1&&<div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <Inp label="Nome completo *" value={nome} onChange={e=>setNome(e.target.value)}/>
          <Inp label="E-mail *" value={email} onChange={e=>setEmail(e.target.value)} type="email"/>
          <Inp label="Telefone *" value={telefone} onChange={e=>setTelefone(e.target.value)} type="tel"/>
          <Inp label="Data de nascimento *" value={nascimento} onChange={e=>setNascimento(e.target.value)} type="date"/>
          <Inp label="CPF ou CNPJ *" value={cpfCnpj} onChange={e=>setCpfCnpj(e.target.value)}/>
          <Inp label="Endereço completo *" value={endereco} onChange={e=>setEndereco(e.target.value)} placeholder="Rua, número, cidade, estado"/>
          <button onClick={()=>{if(!nome||!email||!telefone||!nascimento||!cpfCnpj||!endereco){showMsg("Preencha todos os campos.","error");return;}setStep(2);}} style={{...btnP,marginTop:4}}>Continuar</button>
        </div>}
        {step===2&&<div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <PolosSelector polosSelecionados={polosSel} setPolosSelecionados={setPolosSel} label="Polos em que deseja atuar *"/>
          <div style={{background:"#e0e7ff",border:"1px solid #a5b4fc",borderRadius:8,padding:"10px 12px"}}><p style={{margin:0,fontSize:12,color:"#3730a3",lineHeight:1.5}}>Você precisará de aprovação do responsável pelo polo para começar a atuar.</p></div>
          <button onClick={()=>{if(polosSel.length===0){showMsg("Selecione ao menos um polo.","error");return;}setStep(3);}} style={{...btnP,marginTop:4}}>Continuar</button>
        </div>}
        {step===3&&<div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <div style={{background:"#00e07a15",border:`1px solid ${C.green}55`,borderRadius:8,padding:"10px 12px"}}><p style={{margin:0,fontSize:12,color:"#0a5c35",lineHeight:1.6}}>A chave PIX deve estar no nome do parceiro. Repasses toda sexta-feira.</p></div>
          <Inp label="Chave PIX principal *" value={pixP} onChange={e=>setPixP(e.target.value)} placeholder="CPF, CNPJ, e-mail ou telefone"/>
          <Inp label="Chave PIX secundária (opcional)" value={pixS} onChange={e=>setPixS(e.target.value)}/>
          <Sel label="Como nos encontrou" value={canal} onChange={e=>setCanal(e.target.value)} options={["Indicação de parceiro","Redes sociais","WhatsApp","Site Graduu","Evento presencial","Outro"]}/>
          <button onClick={()=>{if(!pixP){showMsg("Informe a chave PIX principal.","error");return;}setStep(4);}} style={{...btnP,marginTop:4}}>Continuar</button>
        </div>}
        {step===4&&<div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <Inp label="Crie uma senha *" value={senha} onChange={e=>setSenha(e.target.value)} type="password"/>
          <Inp label="Confirme a senha *" value={confirmSenha} onChange={e=>setConfirmSenha(e.target.value)} type="password"/>
          <div style={{background:"#f8f8f8",border:"1.5px solid #ccc",borderRadius:8,padding:12,maxHeight:160,overflowY:"auto"}}>
            <p style={{margin:"0 0 8px",fontSize:12,fontWeight:600}}>Contrato de Adesão</p>
            <pre style={{fontSize:11,lineHeight:1.7,color:"#555",whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{CONTRACT_TEXT}</pre>
          </div>
          <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",background:accepted?"#d4edda":"#f8f8f8",border:`1.5px solid ${accepted?"#a3d9a5":"#ccc"}`,borderRadius:8,padding:12}}>
            <input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} style={{width:16,height:16,marginTop:1,flexShrink:0,accentColor:C.dark,cursor:"pointer"}}/>
            <span style={{fontSize:13,lineHeight:1.5}}>Li e aceito o contrato de adesão</span>
          </label>
          <button onClick={()=>{if(!senha||!confirmSenha){showMsg("Crie uma senha.","error");return;}if(senha!==confirmSenha){showMsg("As senhas não coincidem.","error");return;}if(!accepted){showMsg("Aceite o contrato.","error");return;}onDone({nome,email,telefone,nascimento,cpfCnpj,endereco,pix:pixP,pixSecundario:pixS,canal,senha,polos:polosSel,polosSelecionados:polosSel.map(p=>p.codigo),role:"distribuidor",statusPolos:polosSel.reduce((acc,p)=>({...acc,[p.codigo]:"pendente"}),{}),status:"pendente",criadoEm:new Date().toLocaleDateString("pt-BR")});}} style={{...btnP,marginTop:4}}>Enviar cadastro</button>
        </div>}
      </>}
    </RegisterBase>
  );
}

function LoginScreen({onLogin,onRegisterDist,onRegisterGestor,onRegisterConsultor}){
  const [email,setEmail]=useState("");const [pass,setPass]=useState("");
  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#f2f2f7",padding:20}}>
      <div style={{width:"100%",maxWidth:400,background:"#fff",border:"1px solid #e0e0e0",borderRadius:16,padding:"32px 28px"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{background:`linear-gradient(135deg,${C.dark},${C.purple})`,borderRadius:12,display:"inline-flex",alignItems:"center",padding:"14px 24px",marginBottom:10}}><LogoMark/></div>
          <p style={{margin:0,fontSize:13,color:"#666"}}>Programa de Parceiros Independentes</p>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Inp label="E-mail" value={email} onChange={e=>setEmail(e.target.value)} type="email"/>
          <Inp label="Senha" value={pass} onChange={e=>setPass(e.target.value)} type="password"/>
          <button onClick={()=>onLogin(email,pass)} style={{...btnP,marginTop:4}}>Entrar</button>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <button onClick={onRegisterDist} style={{background:"#00e07a18",border:`1px solid ${C.green}66`,borderRadius:8,padding:"9px",fontSize:11,cursor:"pointer",color:"#0a6640",fontWeight:500}}>Quero ser distribuidor</button>
            <button onClick={onRegisterConsultor} style={{background:"#fef9c3",border:"1px solid #fde047",borderRadius:8,padding:"9px",fontSize:11,cursor:"pointer",color:"#854d0e",fontWeight:500}}>Sou Consultor</button>
          </div>
          <button onClick={onRegisterGestor} style={{background:"#eeeeff",border:`1px solid ${C.dark}33`,borderRadius:8,padding:"9px",fontSize:11,cursor:"pointer",color:C.dark,fontWeight:500}}>Sou Gestor de Polo</button>
        </div>
        <p style={{textAlign:"center",fontSize:11,color:"#aaa",marginTop:16,marginBottom:0}}>Admin: admin@graduu.com.br / graduu2024</p>
      </div>
    </div>
  );
}

// ═══════════════════ APP ═══════════════════
export default function App(){
  const {data,upd}=useStorage();
  const [session,setSession]=useState(null);
  const [screen,setScreen]=useState("login");
  const [tab,setTab]=useState("dashboard");
  const [adminTab,setAdminTab]=useState("gestores");
  const [gestorTab,setGestorTab]=useState("dashboard");
  const [consultorTab,setConsultorTab]=useState("dashboard");
  const [msg,setMsg]=useState(null);
  const [avisoPop,setAvisoPop]=useState(null);
  const [leadForm,setLeadForm]=useState({nome:"",telefone:"",curso:"",cidade:"",modalidade:"",obs:""});
  const [showLeadForm,setShowLeadForm]=useState(false);

  function showMsg(text,type="success"){setMsg({text,type});setTimeout(()=>setMsg(null),3500);}
  const moverHook=useMoverLead(data||{users:[],leads:[],avisos:[],materiais:[],metas:{}},upd);
  const {tentar,modalDados,setModalDados,salvarDados,modalMatricula,setModalMatricula,salvarMatricula}=moverHook;

  useEffect(()=>{
    if(!session||!data)return;
    const meuId=session.id||"admin"; const meuRole=session.role||"admin";
    const lidos=JSON.parse(localStorage.getItem(`lidos_${meuId}`)||"[]");
    const naoLidos=(data.avisos||[]).filter(a=>{
      if(lidos.includes(a.id))return false;
      if(a.remetenteId===meuId)return false;
      if(a.destinatariosTodos?.includes(meuRole))return true;
      if(a.destinatariosEsp?.includes(meuId))return true;
      return false;
    });
    if(naoLidos.length>0&&!avisoPop){setAvisoPop(naoLidos[0]);}
  },[session,data]);

  function marcarLido(id){
    const meuId=session?.id||"admin";
    const lidos=JSON.parse(localStorage.getItem(`lidos_${meuId}`)||"[]");
    localStorage.setItem(`lidos_${meuId}`,JSON.stringify([...new Set([...lidos,id])]));
    setAvisoPop(null);
  }

  function getAvisosBadge(){
    if(!session||!data)return 0;
    const meuId=session.id||"admin"; const meuRole=session.role||"admin";
    const lidos=JSON.parse(localStorage.getItem(`lidos_${meuId}`)||"[]");
    return (data.avisos||[]).filter(a=>!lidos.includes(a.id)&&a.remetenteId!==meuId&&(a.destinatariosTodos?.includes(meuRole)||a.destinatariosEsp?.includes(meuId))).length;
  }

  if(!data) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",color:"#999",fontSize:14}}>Carregando...</div>;

  function handleLogin(email,pass){
    if(email===ADMIN_EMAIL&&pass===ADMIN_PASS){setSession({role:"admin",nome:"Super Admin"});setScreen("app");setAdminTab("gestores");return;}
    const u=(data.users||[]).find(x=>x.email===email&&x.senha===pass);
    if(!u){showMsg("E-mail ou senha incorretos.","error");return;}
    if(u.status==="pendente"){showMsg("Cadastro aguardando aprovação.","warn");return;}
    if(u.status==="rejeitado"){showMsg("Cadastro reprovado.","error");return;}
    setSession({...u});setScreen("app");setTab("dashboard");
  }
  function handleRegister(reg){
    if((data.users||[]).find(x=>x.email===reg.email)){showMsg("E-mail já cadastrado.","error");return;}
    const novo={id:Date.now(),...reg};
    upd({...data,users:[...(data.users||[]),novo]});
    showMsg("Cadastro enviado! Aguarde aprovação.");setScreen("login");
  }
  function handleLeadSubmit(){
    if(!leadForm.nome||!leadForm.telefone||!leadForm.curso||!leadForm.cidade||!leadForm.modalidade){showMsg("Preencha os campos obrigatórios.","error");return;}
    const novo={id:Date.now(),...leadForm,parceiroId:session.id,parceiroNome:session.nome,status:"Indicado",criadoEm:new Date().toLocaleDateString("pt-BR")};
    upd({...data,leads:[...(data.leads||[]),novo]});
    setLeadForm({nome:"",telefone:"",curso:"",cidade:"",modalidade:"",obs:""});setShowLeadForm(false);showMsg("Lead cadastrado!");
  }
  function updateUserStatus(id,status){
    const nd={...data,users:(data.users||[]).map(u=>u.id===id?{...u,status}:u)};
    upd(nd);showMsg(status==="aprovado"?"Aprovado!":"Rejeitado.");
  }
  function aprovarNoMeuPolo(userId,poloCode,status){
    const nd={...data,users:(data.users||[]).map(u=>{
      if(u.id!==userId)return u;
      const ns={...u.statusPolos,[poloCode]:status};
      return {...u,statusPolos:ns,status:Object.values(ns).some(s=>s==="aprovado")?"aprovado":"pendente"};
    })};
    upd(nd);showMsg(status==="aprovado"?"Distribuidor aprovado neste polo!":"Rejeitado neste polo.");
  }
  function convidarConsultor(gestorId,consultorId){
    const nd={...data,users:(data.users||[]).map(u=>u.id!==consultorId?u:{...u,vinculacoesGestor:{...u.vinculacoesGestor,[gestorId]:{status:"pendente_consultor",criadoEm:new Date().toLocaleDateString("pt-BR")}}})};
    upd(nd);showMsg("Convite enviado!");
  }
  function responderConvite(consultorId,gestorId,aceitar){
    const nd={...data,users:(data.users||[]).map(u=>u.id!==consultorId?u:{...u,vinculacoesGestor:{...u.vinculacoesGestor,[gestorId]:{...u.vinculacoesGestor[gestorId],status:aceitar?"pendente_admin":"recusado"}}})};
    upd(nd);showMsg(aceitar?"Aceito! Aguarda Super Admin.":"Convite recusado.");
  }
  function aprovarVinculacao(consultorId,gestorId,aprovar){
    const nd={...data,users:(data.users||[]).map(u=>u.id!==consultorId?u:{...u,vinculacoesGestor:{...u.vinculacoesGestor,[gestorId]:{...u.vinculacoesGestor[gestorId],status:aprovar?"aprovado":"rejeitado"}}})};
    upd(nd);showMsg(aprovar?"Vinculação aprovada!":"Rejeitada.");
  }
  function logout(){setSession(null);setScreen("login");}

  const myLeads=(data.leads||[]).filter(l=>l.parceiroId===session?.id);
  const avisosBadge=getAvisosBadge();

  if(screen==="login") return(<><MsgBanner msg={msg}/><LoginScreen onLogin={handleLogin} onRegisterDist={()=>setScreen("reg-dist")} onRegisterGestor={()=>setScreen("reg-gestor")} onRegisterConsultor={()=>setScreen("reg-consultor")}/></>);
  if(screen==="reg-dist") return(<><MsgBanner msg={msg}/><RegisterScreen onBack={()=>setScreen("login")} onDone={handleRegister} showMsg={showMsg}/></>);
  if(screen==="reg-gestor") return(<><MsgBanner msg={msg}/><RegisterGestorScreen onBack={()=>setScreen("login")} onDone={handleRegister} showMsg={showMsg}/></>);
  if(screen==="reg-consultor") return(<><MsgBanner msg={msg}/><RegisterConsultorScreen onBack={()=>setScreen("login")} onDone={handleRegister} showMsg={showMsg}/></>);

  const Modais=()=><>
    {modalDados&&<ModalDadosCandidato lead={modalDados} onSave={salvarDados} onClose={()=>setModalDados(null)}/>}
    {modalMatricula&&<ModalMatriculaConcluida lead={modalMatricula} onSave={salvarMatricula} onClose={()=>setModalMatricula(null)}/>}
    {avisoPop&&<Modal onClose={()=>marcarLido(avisoPop.id)}>
      <div style={{background:"#fff3cd",borderRadius:8,padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:18}}>🔔</span>
        <span style={{fontSize:12,color:"#856404",fontWeight:500}}>Novo aviso de {avisoPop.remetenteNome}</span>
      </div>
      <h3 style={{margin:"0 0 10px",fontSize:17,fontWeight:600}}>{avisoPop.titulo}</h3>
      <p style={{margin:"0 0 20px",fontSize:14,color:"#444",lineHeight:1.7}}>{avisoPop.corpo}</p>
      <button onClick={()=>marcarLido(avisoPop.id)} style={{...btnP,width:"100%"}}>Entendido</button>
    </Modal>}
  </>;

  // ── ADMIN ──
  if(screen==="app"&&session?.role==="admin"){
    const gestoresPend=(data.users||[]).filter(u=>u.role==="gestor"&&u.status==="pendente");
    const consultoresPend=(data.users||[]).filter(u=>u.role==="consultor"&&u.status==="pendente");
    const distPend=(data.users||[]).filter(u=>u.role==="distribuidor"&&u.status==="pendente");
    const vinculPend=(data.users||[]).filter(u=>u.role==="consultor"&&Object.values(u.vinculacoesGestor||{}).some(v=>v.status==="pendente_admin"));
    const totalLeads=(data.leads||[]).length;
    const totalMat=(data.leads||[]).filter(l=>["Matrícula concluída","Adesão paga","Comissão liberada","Comissão paga"].includes(l.status)).length;

    function UserRow({u}){
      const sc=u.status==="aprovado"?{bg:"#d4edda",tx:"#155724"}:u.status==="rejeitado"?{bg:"#f8d7da",tx:"#721c24"}:{bg:"#fff3cd",tx:"#856404"};
      return(<div style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 16px",marginBottom:6}}>
        <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <p style={{margin:0,fontWeight:500,fontSize:14}}>{u.nome}</p>
              <RoleBadge role={u.role}/>
              <span style={{background:sc.bg,color:sc.tx,fontSize:11,padding:"1px 7px",borderRadius:10}}>{u.status}</span>
            </div>
            <p style={{margin:"0 0 4px",fontSize:12,color:"#666"}}>{u.email} · {u.criadoEm}</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{(u.polos||[]).map((p,i)=><span key={i} style={{background:"#eeeeff",border:`1px solid ${C.dark}22`,borderRadius:5,padding:"1px 7px",fontSize:11,color:C.dark}}>{p.codigo} {p.nome?.slice(0,20)}</span>)}</div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
            {u.status!=="aprovado"&&<button onClick={()=>updateUserStatus(u.id,"aprovado")} style={{background:"none",border:"1px solid #155724",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",color:"#155724"}}>Aprovar</button>}
            {u.status==="aprovado"&&<button onClick={()=>updateUserStatus(u.id,"rejeitado")} style={{background:"none",border:"1px solid #dc3545",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",color:"#dc3545"}}>Suspender</button>}
            {u.status==="rejeitado"&&<button onClick={()=>updateUserStatus(u.id,"aprovado")} style={{background:"none",border:"1px solid #155724",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",color:"#155724"}}>Reativar</button>}
          </div>
        </div>
      </div>);
    }

    return(
      <div style={{minHeight:"100vh",background:"#f2f2f7"}}>
        <MsgBanner msg={msg}/><Modais/>
        <AppHeader session={session} logout={logout} avisosBadge={avisosBadge}/>
        <TabBar tabs={[["gestores","Gestores",gestoresPend.length],["consultores","Consultores",consultoresPend.length+vinculPend.length],["distribuidores","Distribuidores",distPend.length],["leads","Leads",0],["materiais","Materiais",0],["avisos","Avisos",avisosBadge],["comissoes","Comissões",0]]} active={adminTab} setActive={setAdminTab}/>
        <div style={{padding:20,maxWidth:900,margin:"0 auto"}}>

          {adminTab==="gestores"&&<>
            {gestoresPend.length>0&&<><h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:500,color:"#856404"}}>Aguardando aprovação ({gestoresPend.length})</h3>
            {gestoresPend.map(g=>(
              <div key={g.id} style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:10,padding:"14px 16px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  <div>
                    <p style={{margin:"0 0 2px",fontWeight:500,fontSize:14,color:"#856404"}}>{g.nome} · {g.email}</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:6}}>{(g.polos||[]).map((p,i)=><span key={i} style={{background:"#fff",border:"1px solid #ffc107",borderRadius:5,padding:"2px 7px",fontSize:11,color:"#856404"}}>{p.codigo} — {p.nome?.slice(0,25)}</span>)}</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>updateUserStatus(g.id,"aprovado")} style={{background:"#155724",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Aprovar</button>
                    <button onClick={()=>updateUserStatus(g.id,"rejeitado")} style={{background:"#721c24",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Rejeitar</button>
                  </div>
                </div>
              </div>
            ))}</>}
            <h3 style={{margin:"16px 0 12px",fontSize:14,fontWeight:500,color:"#666"}}>Todos os gestores ({(data.users||[]).filter(u=>u.role==="gestor").length})</h3>
            {(data.users||[]).filter(u=>u.role==="gestor").length===0&&<p style={{color:"#aaa",fontSize:13}}>Nenhum gestor cadastrado.</p>}
            {(data.users||[]).filter(u=>u.role==="gestor").map(u=><UserRow key={u.id} u={u}/>)}
          </>}

          {adminTab==="consultores"&&<>
            {vinculPend.length>0&&<><h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:500,color:"#856404"}}>Vinculações para aprovar</h3>
            {vinculPend.map(c=>Object.entries(c.vinculacoesGestor||{}).filter(([,v])=>v.status==="pendente_admin").map(([gId,v])=>{
              const g=(data.users||[]).find(u=>u.id===parseInt(gId));
              return(<div key={`${c.id}-${gId}`} style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:10,padding:"14px 16px",marginBottom:10}}>
                <p style={{margin:"0 0 4px",fontSize:13,color:"#856404"}}>Consultor: <strong>{c.nome}</strong> ↔ Gestor: <strong>{g?.nome||gId}</strong></p>
                <p style={{margin:"0 0 10px",fontSize:12,color:"#856404"}}>{v.criadoEm}</p>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>aprovarVinculacao(c.id,parseInt(gId),true)} style={{background:"#155724",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Aprovar</button>
                  <button onClick={()=>aprovarVinculacao(c.id,parseInt(gId),false)} style={{background:"#721c24",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Rejeitar</button>
                </div>
              </div>);
            }))}
            </>}
            {consultoresPend.length>0&&<><h3 style={{margin:"16px 0 12px",fontSize:14,fontWeight:500,color:"#856404"}}>Cadastros aguardando ({consultoresPend.length})</h3>
            {consultoresPend.map(c=>(
              <div key={c.id} style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:10,padding:"14px 16px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  <div>
                    <p style={{margin:"0 0 2px",fontWeight:500,fontSize:14,color:"#856404"}}>{c.nome} · {c.email}</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:6}}>{(c.polos||[]).map((p,i)=><span key={i} style={{background:"#fff",border:"1px solid #ffc107",borderRadius:5,padding:"2px 7px",fontSize:11,color:"#856404"}}>{p.codigo}</span>)}</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>updateUserStatus(c.id,"aprovado")} style={{background:"#155724",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Aprovar</button>
                    <button onClick={()=>updateUserStatus(c.id,"rejeitado")} style={{background:"#721c24",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Rejeitar</button>
                  </div>
                </div>
              </div>
            ))}</>}
            <h3 style={{margin:"16px 0 12px",fontSize:14,fontWeight:500,color:"#666"}}>Todos os consultores</h3>
            {(data.users||[]).filter(u=>u.role==="consultor").length===0&&<p style={{color:"#aaa",fontSize:13}}>Nenhum consultor cadastrado.</p>}
            {(data.users||[]).filter(u=>u.role==="consultor").map(u=><UserRow key={u.id} u={u}/>)}
          </>}

          {adminTab==="distribuidores"&&<>
            {distPend.length>0&&<><h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:500,color:"#856404"}}>Aguardando ({distPend.length})</h3>
            {distPend.map(u=>(
              <div key={u.id} style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:8}}>
                <div><p style={{margin:0,fontWeight:500,fontSize:14,color:"#856404"}}>{u.nome}</p><p style={{margin:0,fontSize:12,color:"#856404"}}>{u.email} · Polos: {(u.polos||[]).map(p=>p.codigo).join(", ")}</p></div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>updateUserStatus(u.id,"aprovado")} style={{background:"#155724",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Aprovar</button>
                  <button onClick={()=>updateUserStatus(u.id,"rejeitado")} style={{background:"#721c24",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Rejeitar</button>
                </div>
              </div>
            ))}</>}
            <h3 style={{margin:"16px 0 12px",fontSize:14,fontWeight:500,color:"#666"}}>Todos os distribuidores</h3>
            {(data.users||[]).filter(u=>u.role==="distribuidor").map(u=><UserRow key={u.id} u={u}/>)}
          </>}

          {adminTab==="leads"&&<>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
              <MetricCard label="Total de leads" val={totalLeads}/>
              <MetricCard label="Matrículas" val={totalMat} color="#155724"/>
              <MetricCard label="Comissões liberadas" val={`R$ ${((data.leads||[]).filter(l=>l.status==="Comissão liberada").length*174.30).toFixed(2)}`}/>
              <MetricCard label="Comissões pagas" val={`R$ ${((data.leads||[]).filter(l=>l.status==="Comissão paga").length*174.30).toFixed(2)}`}/>
            </div>
            {(data.leads||[]).map(l=>(
              <div key={l.id} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 16px",marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><p style={{margin:0,fontWeight:500,fontSize:14}}>{l.nome}</p><Badge status={l.status}/></div>
                    <p style={{margin:0,fontSize:12,color:"#666"}}>{l.curso} · {l.modalidade} · {l.parceiroNome}</p>
                  </div>
                  <select value={l.status} onChange={e=>tentar(l,e.target.value,showMsg)} style={{padding:"5px 8px",borderRadius:6,border:"1px solid #ccc",fontSize:12,cursor:"pointer"}}>
                    {[...STATUS_PIPELINE,"Glosado"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </>}

          {adminTab==="materiais"&&<MateriaisAdmin data={data} upd={upd} showMsg={showMsg}/>}
          {adminTab==="avisos"&&<AvisosPanel session={session} data={data} upd={upd} showMsg={showMsg}/>}
          {adminTab==="comissoes"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
            <MetricCard label="Total de leads" val={(data.leads||[]).length}/>
            <MetricCard label="Matrículas pagas" val={totalMat}/>
            <MetricCard label="Comissões liberadas" val={`R$ ${((data.leads||[]).filter(l=>l.status==="Comissão liberada").length*174.30).toFixed(2)}`}/>
            <MetricCard label="Comissões pagas" val={`R$ ${((data.leads||[]).filter(l=>l.status==="Comissão paga").length*174.30).toFixed(2)}`}/>
          </div>}
        </div>
      </div>
    );
  }

  // ── GESTOR ──
  if(screen==="app"&&session?.role==="gestor"){
    const meusPolo=(session.polos||[]).map(p=>p.codigo);
    const meusDistribuidores=(data.users||[]).filter(u=>u.role==="distribuidor"&&(u.polos||[]).some(p=>meusPolo.includes(p.codigo)));
    const meusLeads=(data.leads||[]).filter(l=>meusDistribuidores.some(u=>u.id===l.parceiroId));
    const consultoresAprov=(data.users||[]).filter(u=>u.role==="consultor"&&u.status==="aprovado");
    const meusConsultores=consultoresAprov.filter(u=>u.vinculacoesGestor?.[session.id]?.status==="aprovado");
    const convitesPend=consultoresAprov.filter(u=>u.vinculacoesGestor?.[session.id]?.status==="pendente_consultor");
    const pendDist=meusDistribuidores.filter(u=>meusPolo.some(c=>u.statusPolos?.[c]==="pendente"));

    return(
      <div style={{minHeight:"100vh",background:"#f2f2f7"}}>
        <MsgBanner msg={msg}/><Modais/>
        <AppHeader session={session} logout={logout} avisosBadge={avisosBadge}/>
        <TabBar tabs={[["dashboard","Dashboard",0],["distribuidores","Distribuidores",pendDist.length],["consultores","Consultores",0],["metas","Metas",0],["leads","Leads",0],["materiais","Materiais",0],["avisos","Avisos",avisosBadge],["polos","Meus Polos",0]]} active={gestorTab} setActive={setGestorTab}/>
        <div style={{padding:16,maxWidth:900,margin:"0 auto"}}>
          {gestorTab==="dashboard"&&<>
            <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:600}}>Dashboard — {getMes()}</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20}}>
              <MetricCard label="Distribuidores" val={meusDistribuidores.length}/>
              <MetricCard label="Consultores" val={meusConsultores.length}/>
              <MetricCard label="Total de leads" val={meusLeads.length}/>
              <MetricCard label="Matrículas" val={meusLeads.filter(l=>["Matrícula concluída","Adesão paga","Comissão liberada","Comissão paga"].includes(l.status)).length} color="#155724"/>
            </div>
          </>}
          {gestorTab==="distribuidores"&&<>
            {pendDist.length>0&&<><h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:500,color:"#856404"}}>Aguardando aprovação</h3>
            {pendDist.map(u=>(
              <div key={u.id} style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:10,padding:"14px 16px",marginBottom:10}}>
                <p style={{margin:"0 0 4px",fontWeight:500,fontSize:14,color:"#856404"}}>{u.nome}</p>
                <p style={{margin:"0 0 10px",fontSize:12,color:"#856404"}}>{u.email}</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {meusPolo.filter(c=>u.statusPolos?.[c]==="pendente").map(c=>{
                    const polo=(session.polos||[]).find(p=>p.codigo===c);
                    return polo?(<div key={c} style={{background:"#fff",borderRadius:8,padding:"8px 12px",border:"1px solid #e0e0e0",display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:12,color:"#555"}}>{polo.codigo} — {polo.nome?.slice(0,20)}</span>
                      <button onClick={()=>aprovarNoMeuPolo(u.id,c,"aprovado")} style={{background:"#155724",color:"#fff",border:"none",borderRadius:5,padding:"3px 10px",fontSize:11,cursor:"pointer"}}>Aprovar</button>
                      <button onClick={()=>aprovarNoMeuPolo(u.id,c,"rejeitado")} style={{background:"#721c24",color:"#fff",border:"none",borderRadius:5,padding:"3px 10px",fontSize:11,cursor:"pointer"}}>Rejeitar</button>
                    </div>):null;
                  })}
                </div>
              </div>
            ))}</>}
            <h3 style={{margin:"16px 0 12px",fontSize:14,fontWeight:500,color:"#666"}}>Distribuidores ({meusDistribuidores.length})</h3>
            {meusDistribuidores.length===0&&<p style={{color:"#aaa",fontSize:13}}>Nenhum distribuidor ainda.</p>}
            {meusDistribuidores.map(u=>(
              <div key={u.id} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 16px",marginBottom:6}}>
                <p style={{margin:"0 0 2px",fontWeight:500,fontSize:14}}>{u.nome}</p>
                <p style={{margin:"0 0 6px",fontSize:12,color:"#666"}}>{u.email} · {meusLeads.filter(l=>l.parceiroId===u.id).length} lead(s)</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{meusPolo.filter(c=>(u.polos||[]).some(p=>p.codigo===c)).map(c=>{const st=u.statusPolos?.[c]||"pendente";const cl=st==="aprovado"?{bg:"#d4edda",tx:"#155724"}:st==="rejeitado"?{bg:"#f8d7da",tx:"#721c24"}:{bg:"#fff3cd",tx:"#856404"};return<span key={c} style={{background:cl.bg,color:cl.tx,fontSize:11,padding:"2px 8px",borderRadius:10}}>{c}: {st}</span>;})}</div>
              </div>
            ))}
          </>}
          {gestorTab==="consultores"&&<>
            {convitesPend.length>0&&<div style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:8,padding:"10px 14px",marginBottom:14}}><p style={{margin:0,fontSize:13,color:"#856404"}}>⏳ {convitesPend.length} convite(s) aguardando resposta do consultor.</p></div>}
            <h4 style={{margin:"0 0 10px",fontSize:13,fontWeight:500,color:"#555"}}>Vinculados ({meusConsultores.length})</h4>
            {meusConsultores.map(c=><div key={c.id} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 16px",marginBottom:6}}><p style={{margin:"0 0 2px",fontWeight:500,fontSize:14}}>{c.nome}</p><p style={{margin:0,fontSize:12,color:"#666"}}>{c.email}</p></div>)}
            <h4 style={{margin:"16px 0 10px",fontSize:13,fontWeight:500,color:"#555"}}>Convidar consultor</h4>
            {consultoresAprov.filter(c=>!c.vinculacoesGestor?.[session.id]).map(c=>(
              <div key={c.id} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 16px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><p style={{margin:"0 0 2px",fontWeight:500,fontSize:14}}>{c.nome}</p><p style={{margin:0,fontSize:12,color:"#666"}}>{c.email}</p></div>
                <button onClick={()=>convidarConsultor(session.id,c.id)} style={{background:`linear-gradient(135deg,${C.dark},${C.purple})`,color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Convidar</button>
              </div>
            ))}
          </>}
          {gestorTab==="metas"&&<MetasGestor session={session} data={data} upd={upd} showMsg={showMsg}/>}
          {gestorTab==="leads"&&<><h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:500,color:"#666"}}>Leads dos distribuidores ({meusLeads.length})</h3>
            {meusLeads.map(l=>(
              <div key={l.id} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 16px",marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  <div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><p style={{margin:0,fontWeight:500,fontSize:14}}>{l.nome}</p><Badge status={l.status}/></div><p style={{margin:0,fontSize:12,color:"#666"}}>{l.curso} · {l.parceiroNome}</p></div>
                  <select value={l.status} onChange={e=>tentar(l,e.target.value,showMsg)} style={{padding:"5px 8px",borderRadius:6,border:"1px solid #ccc",fontSize:12,cursor:"pointer"}}>{[...STATUS_PIPELINE,"Glosado"].map(s=><option key={s}>{s}</option>)}</select>
                </div>
              </div>
            ))}
          </>}
          {gestorTab==="materiais"&&<><h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:500}}>Materiais</h3><MateriaisView role="gestor" materiais={data.materiais||[]}/></>}
          {gestorTab==="avisos"&&<AvisosPanel session={session} data={data} upd={upd} showMsg={showMsg}/>}
          {gestorTab==="polos"&&<>
            <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:500}}>Meus polos</h3>
            {(session.polos||[]).map((p,i)=><div key={i} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 16px",marginBottom:8}}><p style={{margin:"0 0 2px",fontWeight:500,fontSize:14}}>{p.nome}</p><p style={{margin:0,fontSize:12,color:"#888"}}>Código: {p.codigo}{p.cidade?` · ${p.cidade}/${p.estado}`:""}</p></div>)}
          </>}
        </div>
      </div>
    );
  }

  // ── CONSULTOR ──
  if(screen==="app"&&session?.role==="consultor"){
    const meusPolo=(session.polos||[]).map(p=>p.codigo);
    const meusDistribuidores=(data.users||[]).filter(u=>u.role==="distribuidor"&&(u.polos||[]).some(p=>meusPolo.includes(p.codigo)));
    const meusLeads=(data.leads||[]).filter(l=>meusDistribuidores.some(u=>u.id===l.parceiroId));
    const pendDist=meusDistribuidores.filter(u=>meusPolo.some(c=>u.statusPolos?.[c]==="pendente"));
    const convitesRecebidos=Object.entries(session.vinculacoesGestor||{}).filter(([,v])=>v.status==="pendente_consultor");
    const gestoresVinc=Object.entries(session.vinculacoesGestor||{}).filter(([,v])=>v.status==="aprovado").map(([gId])=>(data.users||[]).find(u=>u.id===parseInt(gId))).filter(Boolean);

    return(
      <div style={{minHeight:"100vh",background:"#f2f2f7"}}>
        <MsgBanner msg={msg}/><Modais/>
        <AppHeader session={session} logout={logout} avisosBadge={avisosBadge}/>
        <TabBar tabs={[["dashboard","Dashboard",0],["distribuidores","Distribuidores",pendDist.length],["metas","Metas",0],["gestores","Gestores",convitesRecebidos.length],["leads","Leads",0],["materiais","Materiais",0],["avisos","Avisos",avisosBadge],["polos","Meus Polos",0]]} active={consultorTab} setActive={setConsultorTab}/>
        <div style={{padding:16,maxWidth:860,margin:"0 auto"}}>
          {consultorTab==="dashboard"&&<><h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:600}}>Dashboard — {getMes()}</h3><MetasConsultor session={session} data={data} upd={upd}/></>}
          {consultorTab==="distribuidores"&&<>
            {pendDist.length>0&&<><h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:500,color:"#856404"}}>Aguardando aprovação</h3>
            {pendDist.map(u=>(
              <div key={u.id} style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:10,padding:"14px 16px",marginBottom:10}}>
                <p style={{margin:"0 0 4px",fontWeight:500,fontSize:14,color:"#856404"}}>{u.nome}</p>
                <p style={{margin:"0 0 10px",fontSize:12,color:"#856404"}}>{u.email}</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {meusPolo.filter(c=>u.statusPolos?.[c]==="pendente").map(c=>{
                    const polo=(session.polos||[]).find(p=>p.codigo===c);
                    return polo?(<div key={c} style={{background:"#fff",borderRadius:8,padding:"8px 12px",border:"1px solid #e0e0e0",display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:12,color:"#555"}}>{polo.codigo}</span>
                      <button onClick={()=>aprovarNoMeuPolo(u.id,c,"aprovado")} style={{background:"#155724",color:"#fff",border:"none",borderRadius:5,padding:"3px 10px",fontSize:11,cursor:"pointer"}}>Aprovar</button>
                      <button onClick={()=>aprovarNoMeuPolo(u.id,c,"rejeitado")} style={{background:"#721c24",color:"#fff",border:"none",borderRadius:5,padding:"3px 10px",fontSize:11,cursor:"pointer"}}>Rejeitar</button>
                    </div>):null;
                  })}
                </div>
              </div>
            ))}</>}
            <h3 style={{margin:"16px 0 12px",fontSize:14,fontWeight:500,color:"#666"}}>Distribuidores ({meusDistribuidores.length})</h3>
            {meusDistribuidores.length===0&&<p style={{color:"#aaa",fontSize:13}}>Nenhum distribuidor ainda.</p>}
            {meusDistribuidores.map(u=>(
              <div key={u.id} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 16px",marginBottom:6}}>
                <p style={{margin:"0 0 2px",fontWeight:500,fontSize:14}}>{u.nome}</p>
                <p style={{margin:0,fontSize:12,color:"#666"}}>{meusLeads.filter(l=>l.parceiroId===u.id).length} lead(s)</p>
              </div>
            ))}
          </>}
          {consultorTab==="metas"&&<MetasConsultor session={session} data={data} upd={upd}/>}
          {consultorTab==="gestores"&&<>
            {convitesRecebidos.length>0&&<><h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:500,color:"#856404"}}>Convites pendentes</h3>
            {convitesRecebidos.map(([gId,v])=>{
              const g=(data.users||[]).find(u=>u.id===parseInt(gId));
              return(<div key={gId} style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:10,padding:"14px 16px",marginBottom:10}}>
                <p style={{margin:"0 0 4px",fontWeight:500,fontSize:14,color:"#856404"}}>{g?.nome||"Gestor"} quer te vincular</p>
                <p style={{margin:"0 0 10px",fontSize:12,color:"#856404"}}>{v.criadoEm}</p>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>responderConvite(session.id,parseInt(gId),true)} style={{background:"#155724",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Aceitar</button>
                  <button onClick={()=>responderConvite(session.id,parseInt(gId),false)} style={{background:"#721c24",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Recusar</button>
                </div>
              </div>);
            })}</>}
            <h3 style={{margin:"16px 0 12px",fontSize:14,fontWeight:500,color:"#666"}}>Gestores vinculados ({gestoresVinc.length})</h3>
            {gestoresVinc.length===0&&<p style={{color:"#aaa",fontSize:13}}>Nenhum gestor vinculado.</p>}
            {gestoresVinc.map(g=><div key={g.id} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 16px",marginBottom:6}}><p style={{margin:"0 0 2px",fontWeight:500,fontSize:14}}>{g.nome}</p><p style={{margin:0,fontSize:12,color:"#666"}}>{g.email}</p></div>)}
          </>}
          {consultorTab==="leads"&&<><h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:500,color:"#666"}}>Leads dos distribuidores ({meusLeads.length})</h3>
            {meusLeads.map(l=>(
              <div key={l.id} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 16px",marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  <div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><p style={{margin:0,fontWeight:500,fontSize:14}}>{l.nome}</p><Badge status={l.status}/></div><p style={{margin:0,fontSize:12,color:"#666"}}>{l.curso} · {l.parceiroNome}</p></div>
                  <select value={l.status} onChange={e=>tentar(l,e.target.value,showMsg)} style={{padding:"5px 8px",borderRadius:6,border:"1px solid #ccc",fontSize:12,cursor:"pointer"}}>{[...STATUS_PIPELINE,"Glosado"].map(s=><option key={s}>{s}</option>)}</select>
                </div>
              </div>
            ))}
          </>}
          {consultorTab==="materiais"&&<><h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:500}}>Materiais</h3><MateriaisView role="consultor" materiais={data.materiais||[]}/></>}
          {consultorTab==="avisos"&&<AvisosPanel session={session} data={data} upd={upd} showMsg={showMsg}/>}
          {consultorTab==="polos"&&<>
            <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:500}}>Meus polos</h3>
            {(session.polos||[]).map((p,i)=><div key={i} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 16px",marginBottom:8}}><p style={{margin:"0 0 2px",fontWeight:500,fontSize:14}}>{p.nome}</p><p style={{margin:0,fontSize:12,color:"#888"}}>Código: {p.codigo}{p.cidade?` · ${p.cidade}/${p.estado}`:""}</p></div>)}
          </>}
        </div>
      </div>
    );
  }

  // ── DISTRIBUIDOR ──
  const pago=myLeads.filter(l=>l.status==="Comissão paga").length*174.30;
  const prev=myLeads.filter(l=>l.status==="Comissão liberada").length*174.30;
  return(
    <div style={{minHeight:"100vh",background:"#f2f2f7"}}>
      <MsgBanner msg={msg}/><Modais/>
      <AppHeader session={session} logout={logout} avisosBadge={avisosBadge}/>
      <TabBar tabs={[["dashboard","Dashboard",0],["leads","Meus Leads",0],["ganhos","Ganhos",0],["materiais","Materiais",0],["comissoes","Comissões",0],["avisos","Avisos",avisosBadge]]} active={tab} setActive={setTab}/>
      <div style={{padding:16,maxWidth:820,margin:"0 auto"}}>
        {tab==="dashboard"&&<DashboardDistribuidor session={session} data={data}/>}
        {tab==="leads"&&<KanbanLeads leads={myLeads} onAdd={()=>setShowLeadForm(true)} showForm={showLeadForm} leadForm={leadForm} setLeadForm={setLeadForm} onSubmit={handleLeadSubmit} onCancel={()=>setShowLeadForm(false)} onMove={(lead,status)=>tentar(lead,status,showMsg)}/>}
        {tab==="ganhos"&&<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20}}>
            <MetricCard label="Leads cadastrados" val={myLeads.length}/>
            <MetricCard label="Matrículas" val={myLeads.filter(l=>["Matrícula concluída","Adesão paga","Comissão liberada","Comissão paga"].includes(l.status)).length}/>
            <MetricCard label="Comissão prevista" val={`R$ ${prev.toFixed(2)}`}/>
            <MetricCard label="Total recebido" val={`R$ ${pago.toFixed(2)}`} color="#155724"/>
          </div>
          <div style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:16,marginBottom:14}}>
            <h4 style={{margin:"0 0 8px",fontSize:14,fontWeight:500}}>Regra de pagamento</h4>
            <p style={{margin:0,fontSize:13,color:"#666",lineHeight:1.6}}>Repasse de 100% da taxa de adesão via PIX toda sexta-feira. Chave: <strong>{session?.pix}</strong></p>
          </div>
          {myLeads.filter(l=>["Comissão liberada","Comissão paga","Glosado"].includes(l.status)).map(l=>(
            <div key={l.id} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:8,padding:"10px 14px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><p style={{margin:0,fontSize:13,fontWeight:500}}>{l.nome}</p><p style={{margin:0,fontSize:12,color:"#666"}}>{l.curso}</p></div>
              <div style={{textAlign:"right"}}><Badge status={l.status}/><p style={{margin:"4px 0 0",fontSize:13,fontWeight:700,color:l.status==="Glosado"?C.danger:C.dark}}>{l.status==="Glosado"?"—":"R$ 174,30"}</p></div>
            </div>
          ))}
        </>}
        {tab==="materiais"&&<><h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:500}}>Materiais</h3><MateriaisView role="distribuidor" materiais={data.materiais||[]}/></>}
        {tab==="comissoes"&&<>
          <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:500}}>Tabela de comissionamento</h3>
          <div style={{background:"#00e07a15",border:`1px solid ${C.green}55`,borderRadius:8,padding:"10px 14px",marginBottom:16}}><p style={{margin:0,fontSize:13,color:"#0a5c35"}}>Você recebe 100% da taxa de adesão paga pelo aluno.</p></div>
          {COMMISSION_TABLE.map((c,i)=>(
            <div key={i} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <p style={{margin:0,fontSize:13}}>{c.categoria}</p>
              <p style={{margin:0,fontSize:15,fontWeight:700,color:C.dark}}>R$ {c.valor.toFixed(2)}</p>
            </div>
          ))}
        </>}
        {tab==="avisos"&&<AvisosPanel session={session} data={data} upd={upd} showMsg={showMsg}/>}
      </div>
    </div>
  );
}
