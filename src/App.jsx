import { useState, useEffect, useRef } from "react";
import { loadData, saveData } from "./lib/storage.js";

const ADMIN_EMAIL = "admin@graduu.com.br";
const ADMIN_PASS = "graduu2024";
const C = { dark:"#1a1a3e", purple:"#2d1b5e", pink:"#e05a8a", green:"#00e07a", danger:"#dc3545" };

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
  { key:"Indicado",            color:"#dbeafe", border:"#93c5fd", text:"#1e40af" },
  { key:"Em atendimento",      color:"#fef9c3", border:"#fde047", text:"#854d0e" },
  { key:"Matrícula iniciada",  color:"#ffedd5", border:"#fdba74", text:"#7c2d12" },
  { key:"Matrícula concluída", color:"#dcfce7", border:"#86efac", text:"#14532d" },
  { key:"Adesão paga",         color:"#d1fae5", border:"#34d399", text:"#064e3b" },
  { key:"Comissão liberada",   color:"#e0e7ff", border:"#a5b4fc", text:"#3730a3" },
  { key:"Comissão paga",       color:"#f0fdf4", border:"#4ade80", text:"#166534" },
];
const MATERIAIS = [
  { tipo:"Arte",  titulo:"Banner EAD — Redes Sociais",     desc:"Arte padrão para divulgação nos stories e feed." },
  { tipo:"Texto", titulo:"Script de abordagem — WhatsApp", desc:"Mensagem pronta para enviar a contatos interessados." },
  { tipo:"Vídeo", titulo:"Apresentação do programa",       desc:"Vídeo institucional para compartilhar com leads." },
  { tipo:"Arte",  titulo:"Flyer digital — Pós-Graduação",  desc:"Arte pronta para divulgação em grupos e comunidades." },
  { tipo:"Texto", titulo:"E-mail de prospecção",           desc:"Modelo de e-mail profissional para prospects corporativos." },
];
const CONTRACT_TEXT = `CONTRATO DE ADESÃO — PROGRAMA DE PARCERIA EDUCACIONAL INDEPENDENTE

Entre GRADUU EDUCACIONAL (CNPJ 53.875.358/0001-24) e o PARCEIRO identificado no cadastro.

Cláusula 1 – Objeto: Participação no Programa de Parceria Educacional para captação de alunos para cursos da Faculdade UniFECAF.

Cláusula 2 – Atividades: O parceiro atuará de forma autônoma e independente na prospecção, indicação e matrícula de candidatos.

Cláusula 3 – Comissionamento: 100% do valor da taxa de adesão paga pelo aluno é repassado ao parceiro, via PIX, semanalmente às sextas-feiras.

Cláusula 4 – Pagamento: O aluno paga diretamente à GRADUU. O parceiro não está autorizado a receber valores do aluno.

Cláusula 5 – Vigência: Prazo indeterminado. Qualquer parte pode rescindir com comunicação prévia.

Cláusula 6 – LGPD: O parceiro se compromete a coletar dados pessoais somente para fins de prospecção e matrícula.

Foro: Comarca de Sorocaba/SP.`;

const iStyle = { display:"block", width:"100%", boxSizing:"border-box", padding:"9px 12px", fontSize:14, borderRadius:8, border:"1.5px solid #b0b0b0", background:"#fff", color:"#111", outline:"none", fontFamily:"inherit" };
const lStyle = { display:"block", fontSize:12, color:"#555", marginBottom:4 };
const btnP   = { background:`linear-gradient(135deg,${C.dark},${C.purple})`, color:"#fff", border:"none", borderRadius:8, padding:"10px 20px", fontSize:14, fontWeight:500, cursor:"pointer" };

function dadosCandidatoCompletos(lead) {
  const d = lead.dadosCandidato || {};
  return ["nomeCompleto","cpf","rg","nascimento","email","telefone","endereco","estadoCivil"].every(k => d[k]?.trim());
}
function matriculaConfirmada(lead) { return !!lead.tipoMatricula; }

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
function MetricCard({ label, val }) {
  return (
    <div style={{ background:"#f4f4f8", borderRadius:8, padding:"1rem" }}>
      <p style={{ margin:"0 0 4px", fontSize:12, color:"#666" }}>{label}</p>
      <p style={{ margin:0, fontSize:20, fontWeight:500, color:"#111" }}>{val}</p>
    </div>
  );
}
function Modal({ children, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:14, padding:24, maxWidth:520, width:"100%", maxHeight:"90vh", overflowY:"auto", position:"relative" }}>
        {onClose && <button onClick={onClose} style={{ position:"absolute", top:12, right:14, background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#aaa" }}>✕</button>}
        {children}
      </div>
    </div>
  );
}
function AppHeader({ session, logout }) {
  const roleLabel = session?.role==="admin" ? "Super Admin" : session?.role==="gestor" ? "Gestor de Polo" : null;
  return (
    <div style={{ background:`linear-gradient(135deg,${C.dark},${C.purple})`, padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <LogoMark/>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ color:"#fff", fontSize:12, opacity:0.8 }}>{session?.nome}</span>
        {roleLabel && <span style={{ background:"#ffffff22", borderRadius:4, color:"#fff", fontSize:10, padding:"2px 7px" }}>{roleLabel}</span>}
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
  const bg = msg.type==="error"?"#f8d7da":msg.type==="warn"?"#fff3cd":"#d4edda";
  const tx = msg.type==="error"?"#721c24":msg.type==="warn"?"#856404":"#155724";
  return <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background:bg, color:tx, padding:"10px 20px", borderRadius:8, fontSize:13, zIndex:999, boxShadow:"0 2px 8px #0002", maxWidth:420, textAlign:"center" }}>{msg.text}</div>;
}

function ModalDadosCandidato({ lead, onSave, onClose }) {
  const d = lead.dadosCandidato || {};
  const [f, setF] = useState({ nomeCompleto:d.nomeCompleto||"", cpf:d.cpf||"", rg:d.rg||"", nascimento:d.nascimento||"", email:d.email||"", telefone:d.telefone||"", endereco:d.endereco||"", estadoCivil:d.estadoCivil||"" });
  function salvar() {
    const ok = ["nomeCompleto","cpf","rg","nascimento","email","telefone","endereco","estadoCivil"].every(k=>f[k]?.trim());
    if (!ok) { alert("Preencha todos os campos."); return; }
    onSave(f);
  }
  return (
    <Modal onClose={onClose}>
      <h3 style={{ margin:"0 0 6px", fontSize:16, fontWeight:600 }}>Dados do candidato</h3>
      <p style={{ margin:"0 0 16px", fontSize:13, color:"#666" }}>Preencha todos os dados para avançar para <strong>Matrícula iniciada</strong>.</p>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <Inp label="Nome completo *" value={f.nomeCompleto} onChange={e=>setF({...f,nomeCompleto:e.target.value})}/>
        <Inp label="CPF *" value={f.cpf} onChange={e=>setF({...f,cpf:e.target.value})}/>
        <Inp label="RG *" value={f.rg} onChange={e=>setF({...f,rg:e.target.value})}/>
        <Inp label="Data de nascimento *" value={f.nascimento} onChange={e=>setF({...f,nascimento:e.target.value})} type="date"/>
        <Inp label="E-mail *" value={f.email} onChange={e=>setF({...f,email:e.target.value})} type="email"/>
        <Inp label="Telefone *" value={f.telefone} onChange={e=>setF({...f,telefone:e.target.value})} type="tel"/>
        <Inp label="Endereço completo *" value={f.endereco} onChange={e=>setF({...f,endereco:e.target.value})}/>
        <Sel label="Estado civil *" value={f.estadoCivil} onChange={e=>setF({...f,estadoCivil:e.target.value})} options={["Solteiro(a)","Casado(a)","Divorciado(a)","Viúvo(a)","União estável"]}/>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:16 }}>
        <button onClick={salvar} style={{ ...btnP, flex:1 }}>Salvar e avançar</button>
        <button onClick={onClose} style={{ flex:1, background:"none", border:"1px solid #ccc", borderRadius:8, padding:"10px", fontSize:13, cursor:"pointer", color:"#666" }}>Cancelar</button>
      </div>
    </Modal>
  );
}

function ModalMatriculaConcluida({ lead, onSave, onClose }) {
  const [step, setStep] = useState(1);
  const [tipo, setTipo] = useState("");
  const [arquivo, setArquivo] = useState(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const fileRef = useRef();
  function handleFile(e) {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 3*1024*1024) { alert("Máximo 3MB."); return; }
    const r = new FileReader(); r.onload = ev => { setArquivo(ev.target.result); setNomeArquivo(file.name); }; r.readAsDataURL(file);
  }
  function avancar() {
    if (!tipo) { alert("Selecione o tipo de matrícula."); return; }
    if (tipo==="fisica") { setStep(2); return; }
    onSave({ tipoMatricula:"virtual", tarefaAdmin:true });
  }
  function finalizar() {
    if (!arquivo) { alert("Faça o upload do contrato."); return; }
    onSave({ tipoMatricula:"fisica", contratoArquivo:arquivo, contratoNome:nomeArquivo });
  }
  return (
    <Modal onClose={onClose}>
      {step===1 && <>
        <h3 style={{ margin:"0 0 6px", fontSize:16, fontWeight:600 }}>Confirmar matrícula</h3>
        <p style={{ margin:"0 0 20px", fontSize:13, color:"#666" }}>Como a matrícula foi realizada?</p>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[["virtual","Virtual (sistema online)"],["fisica","Física (contrato impresso)"]].map(([v,l])=>(
            <label key={v} style={{ display:"flex", alignItems:"center", gap:12, border:`1.5px solid ${tipo===v?C.dark:"#ccc"}`, borderRadius:10, padding:"14px 16px", cursor:"pointer", background:tipo===v?"#eeeeff":"#fff" }}>
              <input type="radio" name="tipo" value={v} checked={tipo===v} onChange={()=>setTipo(v)} style={{ width:16, height:16, accentColor:C.dark }}/>
              <span style={{ fontSize:14, fontWeight:tipo===v?600:400 }}>{l}</span>
            </label>
          ))}
        </div>
        {tipo==="virtual" && <div style={{ background:"#e0e7ff", border:"1px solid #a5b4fc", borderRadius:8, padding:"10px 12px", marginTop:14 }}><p style={{ margin:0, fontSize:12, color:"#3730a3" }}>Uma tarefa será criada para o Admin confirmar a matrícula.</p></div>}
        <div style={{ display:"flex", gap:8, marginTop:20 }}>
          <button onClick={avancar} style={{ ...btnP, flex:1 }}>Confirmar</button>
          <button onClick={onClose} style={{ flex:1, background:"none", border:"1px solid #ccc", borderRadius:8, padding:"10px", fontSize:13, cursor:"pointer", color:"#666" }}>Cancelar</button>
        </div>
      </>}
      {step===2 && <>
        <h3 style={{ margin:"0 0 6px", fontSize:16, fontWeight:600 }}>Upload do contrato</h3>
        <p style={{ margin:"0 0 16px", fontSize:13, color:"#666" }}>Envie o contrato físico digitalizado (imagem ou PDF, máx. 3MB).</p>
        <div onClick={()=>fileRef.current.click()} style={{ border:"2px dashed #ccc", borderRadius:10, padding:"32px 20px", textAlign:"center", cursor:"pointer", background:"#f9f9f9", marginBottom:14 }}>
          {nomeArquivo ? <div><p style={{ margin:"0 0 4px", fontSize:14, fontWeight:500, color:C.dark }}>{nomeArquivo}</p><p style={{ margin:0, fontSize:12, color:"#888" }}>Clique para substituir</p></div>
          : <div><p style={{ margin:"0 0 4px", fontSize:32 }}>📎</p><p style={{ margin:"0 0 4px", fontSize:14, color:"#555" }}>Clique para selecionar</p><p style={{ margin:0, fontSize:12, color:"#aaa" }}>JPG, PNG ou PDF — máx. 3MB</p></div>}
        </div>
        <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFile} style={{ display:"none" }}/>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={finalizar} style={{ ...btnP, flex:1 }}>Enviar e confirmar</button>
          <button onClick={()=>setStep(1)} style={{ flex:1, background:"none", border:"1px solid #ccc", borderRadius:8, padding:"10px", fontSize:13, cursor:"pointer", color:"#666" }}>Voltar</button>
        </div>
      </>}
    </Modal>
  );
}

function useMoverLead(data, setData) {
  const [pendente, setPendente] = useState(null);
  const [modalDados, setModalDados] = useState(null);
  const [modalMatricula, setModalMatricula] = useState(null);

  function tentar(lead, novoStatus, showMsg) {
    if (novoStatus===lead.status) return;
    const idxNovo = STATUS_PIPELINE.indexOf(novoStatus);
    const idxMatI = STATUS_PIPELINE.indexOf("Matrícula iniciada");
    const idxMatC = STATUS_PIPELINE.indexOf("Matrícula concluída");
    if (idxNovo>=idxMatI && !dadosCandidatoCompletos(lead)) { setPendente({lead,novoStatus,showMsg}); setModalDados(lead); return; }
    if (idxNovo===idxMatC && !matriculaConfirmada(lead)) { setPendente({lead,novoStatus,showMsg}); setModalMatricula(lead); return; }
    if (idxNovo>idxMatC && !matriculaConfirmada(lead)) { showMsg("Confirme o tipo de matrícula antes de avançar.","error"); return; }
    mover(lead.id, novoStatus, {}, showMsg);
  }
  function mover(id, status, extra, showMsg) {
    setData(prev => {
      const leads = prev.leads.map(l=>l.id===id?{...l,status,...extra}:l);
      const nd = {...prev,leads};
      saveData(nd);
      return nd;
    });
    showMsg(`Status: "${status}"`);
  }
  function salvarDados(dadosCandidato) {
    if (!pendente) return;
    const { lead, novoStatus, showMsg } = pendente;
    setData(prev => {
      const leads = prev.leads.map(l=>l.id===lead.id?{...l,dadosCandidato,status:novoStatus}:l);
      const nd = {...prev,leads};
      saveData(nd);
      return nd;
    });
    showMsg(`Status: "${novoStatus}"`);
    setModalDados(null); setPendente(null);
  }
  function salvarMatricula(info) {
    if (!pendente) return;
    const { lead, novoStatus, showMsg } = pendente;
    setData(prev => {
      const leads = prev.leads.map(l=>l.id===lead.id?{...l,...info,status:novoStatus}:l);
      const nd = {...prev,leads};
      saveData(nd);
      return nd;
    });
    showMsg(info.tipoMatricula==="virtual"?"Matrícula virtual registrada!":"Contrato enviado!");
    setModalMatricula(null); setPendente(null);
  }
  return { tentar, modalDados, setModalDados, salvarDados, modalMatricula, setModalMatricula, salvarMatricula };
}

function LeadForm({ form, setForm, onSubmit, onCancel }) {
  return (
    <div style={{ background:"#fff", border:"1px solid #ddd", borderRadius:12, padding:20, marginBottom:20 }}>
      <h4 style={{ margin:"0 0 14px", fontSize:14, fontWeight:500 }}>Cadastrar novo lead</h4>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Inp label="Nome *" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/>
        <Inp label="Telefone *" value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})} type="tel"/>
        <Inp label="Cidade *" value={form.cidade} onChange={e=>setForm({...form,cidade:e.target.value})}/>
        <div><label style={lStyle}>Modalidade *</label>
          <select value={form.modalidade} onChange={e=>setForm({...form,modalidade:e.target.value})} style={iStyle}>
            <option value="">Selecione...</option>
            {["EAD","Semipresencial","Pós-Graduação"].map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ gridColumn:"1/-1" }}><Inp label="Curso *" value={form.curso} onChange={e=>setForm({...form,curso:e.target.value})}/></div>
        <div style={{ gridColumn:"1/-1" }}><label style={lStyle}>Observações</label><textarea value={form.obs} onChange={e=>setForm({...form,obs:e.target.value})} rows={2} style={{ ...iStyle, resize:"vertical" }}/></div>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:14 }}>
        <button onClick={onSubmit} style={{ background:`linear-gradient(135deg,${C.dark},${C.purple})`, color:"#fff", border:"none", borderRadius:7, padding:"8px 20px", fontSize:13, cursor:"pointer", fontWeight:500 }}>Salvar</button>
        <button onClick={onCancel} style={{ background:"none", border:"1px solid #ccc", borderRadius:7, padding:"8px 14px", fontSize:13, cursor:"pointer", color:"#666" }}>Cancelar</button>
      </div>
    </div>
  );
}

function KanbanLeads({ leads, onAdd, showForm, leadForm, setLeadForm, onSubmit, onCancel, onMove }) {
  const [dragging, setDragging] = useState(null);
  const [overCol, setOverCol] = useState(null);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <h3 style={{ margin:0, fontSize:15, fontWeight:500 }}>Meus leads ({leads.length})</h3>
        <button onClick={onAdd} style={{ background:`linear-gradient(135deg,${C.dark},${C.purple})`, color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:13, cursor:"pointer", fontWeight:500 }}>+ Novo lead</button>
      </div>
      {showForm && <LeadForm form={leadForm} setForm={setLeadForm} onSubmit={onSubmit} onCancel={onCancel}/>}
      {leads.length===0&&!showForm&&<p style={{ color:"#aaa", fontSize:13 }}>Nenhum lead ainda.</p>}
      <div style={{ overflowX:"auto", paddingBottom:12 }}>
        <div style={{ display:"flex", gap:10, minWidth:KANBAN_COLS.length*190+"px" }}>
          {KANBAN_COLS.map(col=>{
            const colLeads=leads.filter(l=>l.status===col.key);
            const isOver=overCol===col.key;
            return (
              <div key={col.key} onDragOver={e=>{e.preventDefault();setOverCol(col.key);}} onDrop={e=>{e.preventDefault();if(dragging&&dragging.status!==col.key)onMove(dragging,col.key);setDragging(null);setOverCol(null);}}
                style={{ flex:"0 0 180px", background:isOver?col.border+"55":col.color, border:`1.5px solid ${isOver?col.border:col.border+"99"}`, borderRadius:10, padding:"10px 8px", minHeight:300, transition:"background 0.15s" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <p style={{ margin:0, fontSize:11, fontWeight:700, color:col.text }}>{col.key}</p>
                  <span style={{ background:col.border, color:col.text, fontSize:10, fontWeight:700, borderRadius:10, padding:"1px 6px" }}>{colLeads.length}</span>
                </div>
                {colLeads.map(lead=>(
                  <div key={lead.id} draggable onDragStart={e=>{setDragging(lead);e.dataTransfer.effectAllowed="move";}} onDragEnd={()=>{setDragging(null);setOverCol(null);}}
                    style={{ background:"#fff", border:"1px solid #e0e0e0", borderRadius:8, padding:"9px 10px", cursor:"grab", opacity:dragging?.id===lead.id?0.4:1, marginBottom:7, userSelect:"none" }}>
                    <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:600 }}>{lead.nome}</p>
                    <p style={{ margin:"0 0 2px", fontSize:11, color:"#666" }}>{lead.modalidade}</p>
                    <p style={{ margin:0, fontSize:11, color:"#999", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lead.curso}</p>
                    {lead.tipoMatricula&&<p style={{ margin:"4px 0 0", fontSize:10, color:"#3730a3", fontWeight:600 }}>📋 {lead.tipoMatricula==="virtual"?"Virtual":"Física"}</p>}
                  </div>
                ))}
                {isOver&&dragging&&dragging.status!==col.key&&(
                  <div style={{ border:`2px dashed ${col.border}`, borderRadius:8, height:60, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontSize:11, color:col.text }}>Soltar aqui</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AdminLeads({ leads, users, mover, showMsg }) {
  const [filtroDist, setFiltroDist] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const distribuidores = users.filter(u=>u.role==="distribuidor"||!u.role);
  const filtered = leads.filter(l=>{
    const okD = filtroDist==="todos"||String(l.parceiroId)===String(filtroDist);
    const okS = filtroStatus==="todos"||l.status===filtroStatus;
    return okD&&okS;
  });
  return (
    <>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14, alignItems:"flex-end" }}>
        <div style={{ flex:1, minWidth:180 }}>
          <label style={{ fontSize:11, color:"#888", display:"block", marginBottom:3 }}>Distribuidor</label>
          <select value={filtroDist} onChange={e=>setFiltroDist(e.target.value)} style={{ ...iStyle, fontSize:13, padding:"7px 10px" }}>
            <option value="todos">Todos</option>
            {distribuidores.map(u=><option key={u.id} value={String(u.id)}>{u.nome}</option>)}
          </select>
        </div>
        <div style={{ flex:1, minWidth:160 }}>
          <label style={{ fontSize:11, color:"#888", display:"block", marginBottom:3 }}>Status</label>
          <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={{ ...iStyle, fontSize:13, padding:"7px 10px" }}>
            <option value="todos">Todos</option>
            {[...STATUS_PIPELINE,"Glosado"].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <span style={{ fontSize:12, color:"#888", paddingBottom:10 }}>{filtered.length} lead(s)</span>
      </div>
      {filtered.map(l=>(
        <div key={l.id} style={{ background:"#fff", border:"1px solid #e0e0e0", borderRadius:10, padding:"12px 16px", marginBottom:6 }}>
          <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                <p style={{ margin:0, fontWeight:500, fontSize:14 }}>{l.nome}</p>
                <Badge status={l.status}/>
                {l.tarefaAdmin&&<span style={{ background:"#fff3cd", color:"#856404", fontSize:10, padding:"1px 6px", borderRadius:8, fontWeight:600 }}>⏳ Confirmar</span>}
              </div>
              <p style={{ margin:0, fontSize:12, color:"#666" }}>{l.telefone} · {l.curso} · {l.modalidade}</p>
              <p style={{ margin:"2px 0 0", fontSize:11, color:"#999" }}>Distribuidor: {l.parceiroNome} · {l.criadoEm}</p>
            </div>
            <select value={l.status} onChange={e=>mover(l,e.target.value,showMsg)} style={{ padding:"5px 8px", borderRadius:6, border:"1px solid #ccc", fontSize:12, cursor:"pointer" }}>
              {[...STATUS_PIPELINE,"Glosado"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      ))}
    </>
  );
}

function RegisterGestorScreen({ onBack, onDone, showMsg }) {
  const [step,setStep]=useState(1);
  const [nome,setNome]=useState(""); const [email,setEmail]=useState("");
  const [telefone,setTelefone]=useState(""); const [cpfCnpj,setCpfCnpj]=useState("");
  const [senha,setSenha]=useState(""); const [confirmSenha,setConfirmSenha]=useState("");
  const [polos,setPolos]=useState([{cidade:"",estado:"",codigo:""}]);
  function addPolo(){setPolos([...polos,{cidade:"",estado:"",codigo:""}]);}
  function removePolo(i){if(polos.length===1)return;setPolos(polos.filter((_,idx)=>idx!==i));}
  function updatePolo(i,field,val){setPolos(polos.map((p,idx)=>idx===i?{...p,[field]:val}:p));}
  const bar=<div style={{display:"flex",gap:6,marginTop:8}}>{[1,2,3].map(n=><div key={n} style={{flex:1,height:3,borderRadius:2,background:n<=step?`linear-gradient(90deg,${C.dark},${C.purple})`:"#ddd"}}/>)}</div>;
  return (
    <div style={{minHeight:500,display:"flex",flexDirection:"column",alignItems:"center",background:"#f2f2f7",padding:20}}>
      <div style={{width:"100%",maxWidth:480,background:"#fff",border:"1px solid #e0e0e0",borderRadius:16,padding:"28px 24px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <button onClick={()=>step>1?setStep(step-1):onBack()} style={{background:"none",border:"none",cursor:"pointer",color:"#666",fontSize:22,padding:0}}>←</button>
          <div style={{flex:1}}><h2 style={{margin:0,fontSize:16,fontWeight:500}}>Cadastro de Gestor de Polo</h2>{bar}<p style={{margin:"4px 0 0",fontSize:11,color:"#999"}}>Etapa {step} de 3</p></div>
        </div>
        {step===1&&<div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <Inp label="Nome completo *" value={nome} onChange={e=>setNome(e.target.value)}/>
          <Inp label="E-mail *" value={email} onChange={e=>setEmail(e.target.value)} type="email"/>
          <Inp label="Telefone *" value={telefone} onChange={e=>setTelefone(e.target.value)} type="tel"/>
          <Inp label="CPF ou CNPJ *" value={cpfCnpj} onChange={e=>setCpfCnpj(e.target.value)}/>
          <button onClick={()=>{if(!nome||!email||!telefone||!cpfCnpj){showMsg("Preencha todos os campos.","error");return;}setStep(2);}} style={{...btnP,marginTop:4}}>Continuar</button>
        </div>}
        {step===2&&<div style={{display:"flex",flexDirection:"column",gap:14,marginTop:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{margin:0,fontSize:13,fontWeight:500,color:"#555"}}>Polos que você gerencia</p>
            <button onClick={addPolo} style={{background:"#00e07a18",border:`1px solid ${C.green}55`,borderRadius:6,padding:"4px 12px",fontSize:12,cursor:"pointer",color:"#0a6640",fontWeight:500}}>+ Polo</button>
          </div>
          {polos.map((p,i)=>(
            <div key={i} style={{background:"#f8f8f8",border:"1px solid #e0e0e0",borderRadius:10,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontSize:13,fontWeight:500,color:"#444"}}>Polo {i+1}</span>
                {polos.length>1&&<button onClick={()=>removePolo(i)} style={{background:"none",border:"none",cursor:"pointer",color:"#dc3545",fontSize:18,padding:0}}>✕</button>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <Inp label="Cidade *" value={p.cidade} onChange={e=>updatePolo(i,"cidade",e.target.value)}/>
                <div><label style={lStyle}>Estado *</label>
                  <select value={p.estado} onChange={e=>updatePolo(i,"estado",e.target.value)} style={iStyle}>
                    <option value="">Selecione...</option>
                    {ESTADOS.map(uf=><option key={uf}>{uf}</option>)}
                  </select>
                </div>
                <Inp label="Código do polo *" value={p.codigo} onChange={e=>updatePolo(i,"codigo",e.target.value)} placeholder="Ex: SOC-001"/>
              </div>
            </div>
          ))}
          <button onClick={()=>{if(!polos.every(p=>p.cidade&&p.estado&&p.codigo)){showMsg("Preencha todos os campos dos polos.","error");return;}setStep(3);}} style={btnP}>Continuar</button>
        </div>}
        {step===3&&<div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          <Inp label="Senha *" value={senha} onChange={e=>setSenha(e.target.value)} type="password"/>
          <Inp label="Confirme a senha *" value={confirmSenha} onChange={e=>setConfirmSenha(e.target.value)} type="password"/>
          <div style={{background:"#e0e7ff",border:"1px solid #a5b4fc",borderRadius:8,padding:"10px 12px"}}><p style={{margin:0,fontSize:12,color:"#3730a3",lineHeight:1.6}}>Seu cadastro será analisado pelo Super Admin antes de ser liberado.</p></div>
          <button onClick={()=>{
            if(!senha||!confirmSenha){showMsg("Crie uma senha.","error");return;}
            if(senha!==confirmSenha){showMsg("As senhas não coincidem.","error");return;}
            onDone({nome,email,telefone,cpfCnpj,senha,polos,role:"gestor",status:"pendente",criadoEm:new Date().toLocaleDateString("pt-BR")});
          }} style={{...btnP,marginTop:4}}>Enviar cadastro</button>
        </div>}
      </div>
    </div>
  );
}

function RegisterScreen({ onBack, onDone, showMsg, polosDisponiveis }) {
  const [step,setStep]=useState(1);
  const [nome,setNome]=useState(""); const [email,setEmail]=useState(""); const [telefone,setTelefone]=useState("");
  const [nascimento,setNascimento]=useState(""); const [cpfCnpj,setCpfCnpj]=useState(""); const [endereco,setEndereco]=useState("");
  const [pixP,setPixP]=useState(""); const [pixS,setPixS]=useState(""); const [canal,setCanal]=useState("");
  const [senha,setSenha]=useState(""); const [confirmSenha,setConfirmSenha]=useState(""); const [accepted,setAccepted]=useState(false);
  const [polosSel,setPolosSel]=useState([]);
  function togglePolo(c){setPolosSel(prev=>prev.includes(c)?prev.filter(x=>x!==c):[...prev,c]);}
  const bar=<div style={{display:"flex",gap:6,marginTop:8}}>{[1,2,3,4].map(n=><div key={n} style={{flex:1,height:3,borderRadius:2,background:n<=step?`linear-gradient(90deg,${C.dark},${C.purple})`:"#ddd"}}/>)}</div>;
  return (
    <div style={{minHeight:500,display:"flex",flexDirection:"column",alignItems:"center",background:"#f2f2f7",padding:20}}>
      <div style={{width:"100%",maxWidth:440,background:"#fff",border:"1px solid #e0e0e0",borderRadius:16,padding:"28px 24px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <button onClick={()=>step>1?setStep(step-1):onBack()} style={{background:"none",border:"none",cursor:"pointer",color:"#666",fontSize:22,padding:0}}>←</button>
          <div style={{flex:1}}><h2 style={{margin:0,fontSize:16,fontWeight:500}}>Cadastro de Distribuidor</h2>{bar}<p style={{margin:"4px 0 0",fontSize:11,color:"#999"}}>Etapa {step} de 4</p></div>
        </div>
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
          <p style={{margin:0,fontSize:13,fontWeight:500,color:"#555"}}>Selecione os polos em que atuará</p>
          {polosDisponiveis.length===0?<p style={{fontSize:13,color:"#aaa"}}>Nenhum polo disponível.</p>
          :polosDisponiveis.map(polo=>{
            const sel=polosSel.includes(polo.codigo);
            return(<label key={polo.codigo} style={{display:"flex",alignItems:"center",gap:12,border:`1.5px solid ${sel?C.dark:"#ccc"}`,borderRadius:10,padding:"12px 14px",cursor:"pointer",background:sel?"#eeeeff":"#fff"}}>
              <input type="checkbox" checked={sel} onChange={()=>togglePolo(polo.codigo)} style={{width:16,height:16,accentColor:C.dark}}/>
              <div><p style={{margin:0,fontSize:13,fontWeight:sel?600:400}}>{polo.cidade} — {polo.estado}</p><p style={{margin:0,fontSize:11,color:"#888"}}>Código: {polo.codigo} · Gestor: {polo.gestorNome}</p></div>
            </label>);
          })}
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
          <div style={{background:"#f8f8f8",border:"1.5px solid #ccc",borderRadius:8,padding:12,maxHeight:180,overflowY:"auto"}}>
            <p style={{margin:"0 0 8px",fontSize:12,fontWeight:600}}>Contrato de Adesão</p>
            <pre style={{fontSize:11,lineHeight:1.7,color:"#555",whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{CONTRACT_TEXT}</pre>
          </div>
          <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",background:accepted?"#d4edda":"#f8f8f8",border:`1.5px solid ${accepted?"#a3d9a5":"#ccc"}`,borderRadius:8,padding:12}}>
            <input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} style={{width:16,height:16,marginTop:1,flexShrink:0,accentColor:C.dark,cursor:"pointer"}}/>
            <span style={{fontSize:13,lineHeight:1.5}}>Li e aceito o contrato de adesão</span>
          </label>
          <button onClick={()=>{
            if(!senha||!confirmSenha){showMsg("Crie uma senha.","error");return;}
            if(senha!==confirmSenha){showMsg("As senhas não coincidem.","error");return;}
            if(!accepted){showMsg("Aceite o contrato.","error");return;}
            onDone({nome,email,telefone,nascimento,cpfCnpj,endereco,pix:pixP,pixSecundario:pixS,canal,senha,
              polosSelecionados:polosSel,role:"distribuidor",
              statusPolos:polosSel.reduce((acc,c)=>({...acc,[c]:"pendente"}),{}),
              status:"pendente",criadoEm:new Date().toLocaleDateString("pt-BR")});
          }} style={{...btnP,marginTop:4}}>Enviar cadastro</button>
        </div>}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, onRegisterDist, onRegisterGestor }) {
  const [email,setEmail]=useState(""); const [pass,setPass]=useState("");
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#f2f2f7",padding:20}}>
      <div style={{width:"100%",maxWidth:380,background:"#fff",border:"1px solid #e0e0e0",borderRadius:16,padding:"32px 28px"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{background:`linear-gradient(135deg,${C.dark},${C.purple})`,borderRadius:12,display:"inline-flex",alignItems:"center",padding:"14px 24px",marginBottom:10}}><LogoMark/></div>
          <p style={{margin:0,fontSize:13,color:"#666"}}>Programa de Parceiros Independentes</p>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Inp label="E-mail" value={email} onChange={e=>setEmail(e.target.value)} type="email"/>
          <Inp label="Senha" value={pass} onChange={e=>setPass(e.target.value)} type="password"/>
          <button onClick={()=>onLogin(email,pass)} style={{...btnP,marginTop:4}}>Entrar</button>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onRegisterDist} style={{flex:1,background:"#00e07a18",border:`1px solid ${C.green}66`,borderRadius:8,padding:"9px",fontSize:12,cursor:"pointer",color:"#0a6640",fontWeight:500}}>Quero ser distribuidor</button>
            <button onClick={onRegisterGestor} style={{flex:1,background:"#eeeeff",border:`1px solid ${C.dark}33`,borderRadius:8,padding:"9px",fontSize:12,cursor:"pointer",color:C.dark,fontWeight:500}}>Sou Gestor de Polo</button>
          </div>
        </div>
        <p style={{textAlign:"center",fontSize:11,color:"#aaa",marginTop:16,marginBottom:0}}>Admin: admin@graduu.com.br / graduu2024</p>
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [session, setSession] = useState(null);
  const [screen, setScreen] = useState("login");
  const [tab, setTab] = useState("dashboard");
  const [adminTab, setAdminTab] = useState("gestores");
  const [msg, setMsg] = useState(null);
  const [leadForm, setLeadForm] = useState({nome:"",telefone:"",curso:"",cidade:"",modalidade:"",obs:""});
  const [showLeadForm, setShowLeadForm] = useState(false);

  useEffect(()=>{ loadData().then(setData); },[]);

  function showMsg(text, type="success") { setMsg({text,type}); setTimeout(()=>setMsg(null),3500); }

  const moverHook = useMoverLead(data||{users:[],leads:[]}, setData);
  const { tentar, modalDados, setModalDados, salvarDados, modalMatricula, setModalMatricula, salvarMatricula } = moverHook;

  if (!data) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",color:"#999",fontSize:14}}>Carregando...</div>;

  const polosDisponiveis = (data.users||[]).filter(u=>u.role==="gestor"&&u.status==="aprovado")
    .flatMap(g=>(g.polos||[]).map(p=>({...p,gestorId:g.id,gestorNome:g.nome})));

  function handleLogin(email,pass) {
    if(email===ADMIN_EMAIL&&pass===ADMIN_PASS){setSession({role:"admin",nome:"Super Admin"});setScreen("app");setAdminTab("gestores");return;}
    const u=(data.users||[]).find(x=>x.email===email&&x.senha===pass);
    if(!u){showMsg("E-mail ou senha incorretos.","error");return;}
    if(u.status==="pendente"){showMsg("Cadastro aguardando aprovação.","warn");return;}
    if(u.status==="rejeitado"){showMsg("Cadastro reprovado.","error");return;}
    setSession({...u});setScreen("app");setTab("dashboard");
  }

  function handleRegisterDist(reg) {
    if((data.users||[]).find(x=>x.email===reg.email)){showMsg("E-mail já cadastrado.","error");return;}
    const novo={id:Date.now(),...reg};
    const nd={...data,users:[...(data.users||[]),novo]};
    setData(nd); saveData(nd);
    showMsg("Cadastro enviado! Aguarde aprovação pelo gestor do polo.");setScreen("login");
  }

  function handleRegisterGestor(reg) {
    if((data.users||[]).find(x=>x.email===reg.email)){showMsg("E-mail já cadastrado.","error");return;}
    const novo={id:Date.now(),...reg};
    const nd={...data,users:[...(data.users||[]),novo]};
    setData(nd); saveData(nd);
    showMsg("Cadastro enviado! Aguarde aprovação do Super Admin.");setScreen("login");
  }

  function handleLeadSubmit() {
    if(!leadForm.nome||!leadForm.telefone||!leadForm.curso||!leadForm.cidade||!leadForm.modalidade){showMsg("Preencha os campos obrigatórios.","error");return;}
    const novo={id:Date.now(),...leadForm,parceiroId:session.id,parceiroNome:session.nome,status:"Indicado",criadoEm:new Date().toLocaleDateString("pt-BR")};
    const nd={...data,leads:[...(data.leads||[]),novo]};
    setData(nd); saveData(nd);
    setLeadForm({nome:"",telefone:"",curso:"",cidade:"",modalidade:"",obs:""});setShowLeadForm(false);showMsg("Lead cadastrado!");
  }

  function updateUserStatus(id,status) {
    const nd={...data,users:(data.users||[]).map(u=>u.id===id?{...u,status}:u)};
    setData(nd); saveData(nd); showMsg(status==="aprovado"?"Aprovado!":"Rejeitado.");
  }

  function aprovarNoMeuPolo(userId, poloCode, status) {
    const nd={...data,users:(data.users||[]).map(u=>u.id===userId?{...u,statusPolos:{...u.statusPolos,[poloCode]:status},
      status:Object.values({...u.statusPolos,[poloCode]:status}).some(s=>s==="aprovado")?"aprovado":"pendente"}:u)};
    setData(nd); saveData(nd); showMsg(status==="aprovado"?"Distribuidor aprovado neste polo!":"Rejeitado neste polo.");
  }

  function logout(){setSession(null);setScreen("login");}

  const myLeads=(data.leads||[]).filter(l=>l.parceiroId===session?.id);
  const totalPago=myLeads.filter(l=>l.status==="Comissão paga").length*174.30;
  const totalPrev=myLeads.filter(l=>l.status==="Comissão liberada").length*174.30;

  if(screen==="login") return(<><MsgBanner msg={msg}/><LoginScreen onLogin={handleLogin} onRegisterDist={()=>setScreen("register-dist")} onRegisterGestor={()=>setScreen("register-gestor")}/></>);
  if(screen==="register-dist") return(<><MsgBanner msg={msg}/><RegisterScreen onBack={()=>setScreen("login")} onDone={handleRegisterDist} showMsg={showMsg} polosDisponiveis={polosDisponiveis}/></>);
  if(screen==="register-gestor") return(<><MsgBanner msg={msg}/><RegisterGestorScreen onBack={()=>setScreen("login")} onDone={handleRegisterGestor} showMsg={showMsg}/></>);

  const Modais = ()=><>
    {modalDados&&<ModalDadosCandidato lead={modalDados} onSave={salvarDados} onClose={()=>setModalDados(null)}/>}
    {modalMatricula&&<ModalMatriculaConcluida lead={modalMatricula} onSave={salvarMatricula} onClose={()=>setModalMatricula(null)}/>}
  </>;

  // ── ADMIN ──
  if(screen==="app"&&session?.role==="admin"){
    const gestoresPend=(data.users||[]).filter(u=>u.role==="gestor"&&u.status==="pendente");
    const distPend=(data.users||[]).filter(u=>u.role==="distribuidor"&&u.status==="pendente");
    const tarefas=(data.leads||[]).filter(l=>l.tarefaAdmin).length;
    return(
      <div style={{minHeight:"100vh",background:"#f2f2f7"}}>
        <MsgBanner msg={msg}/><Modais/>
        <AppHeader session={session} logout={logout}/>
        <TabBar tabs={[["gestores","Gestores",gestoresPend.length],["distribuidores","Distribuidores",distPend.length],["leads","Leads",tarefas],["comissoes","Comissões",0]]} active={adminTab} setActive={setAdminTab}/>
        <div style={{padding:20,maxWidth:900,margin:"0 auto"}}>
          {adminTab==="gestores"&&<>
            {gestoresPend.length>0&&<><h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:500,color:"#856404"}}>Aguardando aprovação ({gestoresPend.length})</h3>
            {gestoresPend.map(g=>(
              <div key={g.id} style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:10,padding:"14px 16px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                  <div><p style={{margin:"0 0 2px",fontWeight:500,fontSize:14,color:"#856404"}}>{g.nome}</p>
                    <p style={{margin:"0 0 8px",fontSize:12,color:"#856404"}}>{g.email} · {g.cpfCnpj}</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{(g.polos||[]).map((p,i)=><span key={i} style={{background:"#fff",border:"1px solid #ffc107",borderRadius:6,padding:"2px 8px",fontSize:11,color:"#856404"}}>{p.cidade}/{p.estado} — {p.codigo}</span>)}</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>updateUserStatus(g.id,"aprovado")} style={{background:"#155724",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Aprovar</button>
                    <button onClick={()=>updateUserStatus(g.id,"rejeitado")} style={{background:"#721c24",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Rejeitar</button>
                  </div>
                </div>
              </div>
            ))}</>}
            <h3 style={{margin:"16px 0 12px",fontSize:14,fontWeight:500,color:"#666"}}>Todos os gestores</h3>
            {(data.users||[]).filter(u=>u.role==="gestor").length===0&&<p style={{color:"#aaa",fontSize:13}}>Nenhum gestor cadastrado.</p>}
            {(data.users||[]).filter(u=>u.role==="gestor").map(g=>{
              const sc=g.status==="aprovado"?{bg:"#d4edda",tx:"#155724"}:g.status==="rejeitado"?{bg:"#f8d7da",tx:"#721c24"}:{bg:"#fff3cd",tx:"#856404"};
              return(<div key={g.id} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 16px",marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><p style={{margin:0,fontWeight:500,fontSize:14}}>{g.nome}</p><span style={{background:sc.bg,color:sc.tx,fontSize:11,padding:"1px 7px",borderRadius:10}}>{g.status}</span></div>
                    <p style={{margin:"0 0 6px",fontSize:12,color:"#666"}}>{g.email} · {g.criadoEm}</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{(g.polos||[]).map((p,i)=><span key={i} style={{background:"#eeeeff",border:`1px solid ${C.dark}22`,borderRadius:6,padding:"2px 8px",fontSize:11,color:C.dark}}>{p.cidade}/{p.estado} ({p.codigo})</span>)}</div>
                  </div>
                  {g.status==="aprovado"&&<button onClick={()=>updateUserStatus(g.id,"rejeitado")} style={{background:"none",border:"1px solid #dc3545",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",color:"#dc3545"}}>Suspender</button>}
                  {g.status!=="aprovado"&&<button onClick={()=>updateUserStatus(g.id,"aprovado")} style={{background:"none",border:"1px solid #155724",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",color:"#155724"}}>Aprovar</button>}
                </div>
              </div>);
            })}
          </>}
          {adminTab==="distribuidores"&&<>
            {distPend.length>0&&<><h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:500,color:"#856404"}}>Aguardando ({distPend.length})</h3>
            {distPend.map(u=>(
              <div key={u.id} style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:8}}>
                <div><p style={{margin:0,fontWeight:500,fontSize:14,color:"#856404"}}>{u.nome}</p><p style={{margin:0,fontSize:12,color:"#856404"}}>{u.email} · Polos: {(u.polosSelecionados||[]).join(", ")}</p></div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>updateUserStatus(u.id,"aprovado")} style={{background:"#155724",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Aprovar</button>
                  <button onClick={()=>updateUserStatus(u.id,"rejeitado")} style={{background:"#721c24",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Rejeitar</button>
                </div>
              </div>
            ))}</>}
            <h3 style={{margin:"16px 0 12px",fontSize:14,fontWeight:500,color:"#666"}}>Todos os distribuidores</h3>
            {(data.users||[]).filter(u=>u.role==="distribuidor").map(u=>{
              const sc=u.status==="aprovado"?{bg:"#d4edda",tx:"#155724"}:u.status==="rejeitado"?{bg:"#f8d7da",tx:"#721c24"}:{bg:"#fff3cd",tx:"#856404"};
              return(<div key={u.id} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 16px",marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><p style={{margin:0,fontWeight:500,fontSize:14}}>{u.nome}</p><span style={{background:sc.bg,color:sc.tx,fontSize:11,padding:"1px 7px",borderRadius:10}}>{u.status}</span></div>
                    <p style={{margin:"0 0 4px",fontSize:12,color:"#666"}}>{u.email} · {(data.leads||[]).filter(l=>l.parceiroId===u.id).length} lead(s)</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{(u.polosSelecionados||[]).map(c=>{const st=u.statusPolos?.[c]||"pendente";const cl=st==="aprovado"?{bg:"#d4edda",tx:"#155724"}:st==="rejeitado"?{bg:"#f8d7da",tx:"#721c24"}:{bg:"#fff3cd",tx:"#856404"};return<span key={c} style={{background:cl.bg,color:cl.tx,fontSize:11,padding:"2px 8px",borderRadius:10}}>{c}: {st}</span>;})}</div>
                  </div>
                  {u.status!=="aprovado"&&<button onClick={()=>updateUserStatus(u.id,"aprovado")} style={{background:"none",border:"1px solid #155724",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",color:"#155724"}}>Aprovar</button>}
                  {u.status==="aprovado"&&<button onClick={()=>updateUserStatus(u.id,"rejeitado")} style={{background:"none",border:"1px solid #dc3545",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",color:"#dc3545"}}>Suspender</button>}
                </div>
              </div>);
            })}
          </>}
          {adminTab==="leads"&&<AdminLeads leads={data.leads||[]} users={data.users||[]} mover={tentar} showMsg={showMsg}/>}
          {adminTab==="comissoes"&&<>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
              <MetricCard label="Total de leads" val={(data.leads||[]).length}/>
              <MetricCard label="Matrículas pagas" val={(data.leads||[]).filter(l=>["Adesão paga","Comissão liberada","Comissão paga"].includes(l.status)).length}/>
              <MetricCard label="Comissões liberadas" val={`R$ ${((data.leads||[]).filter(l=>l.status==="Comissão liberada").length*174.30).toFixed(2)}`}/>
              <MetricCard label="Comissões pagas" val={`R$ ${((data.leads||[]).filter(l=>l.status==="Comissão paga").length*174.30).toFixed(2)}`}/>
            </div>
          </>}
        </div>
      </div>
    );
  }

  // ── GESTOR ──
  if(screen==="app"&&session?.role==="gestor"){
    const meusPolo=(session.polos||[]).map(p=>p.codigo);
    const meusDistribuidores=(data.users||[]).filter(u=>u.role==="distribuidor"&&u.polosSelecionados?.some(c=>meusPolo.includes(c)));
    const pendentes=meusDistribuidores.filter(u=>meusPolo.some(c=>u.statusPolos?.[c]==="pendente"));
    const meusLeads=(data.leads||[]).filter(l=>meusDistribuidores.some(u=>u.id===l.parceiroId));
    const [gestorTab,setGestorTab]=useState("distribuidores");
    return(
      <div style={{minHeight:"100vh",background:"#f2f2f7"}}>
        <MsgBanner msg={msg}/><Modais/>
        <AppHeader session={session} logout={logout}/>
        <TabBar tabs={[["distribuidores","Distribuidores",pendentes.length],["leads","Leads",0],["meuspolos","Meus Polos",0]]} active={gestorTab} setActive={setGestorTab}/>
        <div style={{padding:16,maxWidth:860,margin:"0 auto"}}>
          {gestorTab==="meuspolos"&&<>
            <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:500}}>Meus polos</h3>
            {(session.polos||[]).map((p,i)=>(
              <div key={i} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 16px",marginBottom:8}}>
                <p style={{margin:"0 0 2px",fontWeight:500,fontSize:14}}>{p.cidade} — {p.estado}</p>
                <p style={{margin:0,fontSize:12,color:"#888"}}>Código: {p.codigo}</p>
              </div>
            ))}
          </>}
          {gestorTab==="distribuidores"&&<>
            {pendentes.length>0&&<><h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:500,color:"#856404"}}>Aguardando aprovação</h3>
            {pendentes.map(u=>(
              <div key={u.id} style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:10,padding:"14px 16px",marginBottom:10}}>
                <p style={{margin:"0 0 4px",fontWeight:500,fontSize:14,color:"#856404"}}>{u.nome}</p>
                <p style={{margin:"0 0 10px",fontSize:12,color:"#856404"}}>{u.email} · {u.cpfCnpj}</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {meusPolo.filter(c=>u.statusPolos?.[c]==="pendente").map(c=>{
                    const polo=(session.polos||[]).find(p=>p.codigo===c);
                    return polo?(<div key={c} style={{background:"#fff",borderRadius:8,padding:"8px 12px",border:"1px solid #e0e0e0",display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:12,color:"#555"}}>{polo.cidade}/{polo.estado} ({polo.codigo})</span>
                      <button onClick={()=>aprovarNoMeuPolo(u.id,c,"aprovado")} style={{background:"#155724",color:"#fff",border:"none",borderRadius:5,padding:"3px 10px",fontSize:11,cursor:"pointer"}}>Aprovar</button>
                      <button onClick={()=>aprovarNoMeuPolo(u.id,c,"rejeitado")} style={{background:"#721c24",color:"#fff",border:"none",borderRadius:5,padding:"3px 10px",fontSize:11,cursor:"pointer"}}>Rejeitar</button>
                    </div>):null;
                  })}
                </div>
              </div>
            ))}</>}
            <h3 style={{margin:"16px 0 12px",fontSize:14,fontWeight:500,color:"#666"}}>Todos os distribuidores ({meusDistribuidores.length})</h3>
            {meusDistribuidores.length===0&&<p style={{color:"#aaa",fontSize:13}}>Nenhum distribuidor nos seus polos ainda.</p>}
            {meusDistribuidores.map(u=>(
              <div key={u.id} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 16px",marginBottom:6}}>
                <p style={{margin:"0 0 4px",fontWeight:500,fontSize:14}}>{u.nome}</p>
                <p style={{margin:"0 0 6px",fontSize:12,color:"#666"}}>{u.email} · {(data.leads||[]).filter(l=>l.parceiroId===u.id).length} lead(s)</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{(u.polosSelecionados||[]).filter(c=>meusPolo.includes(c)).map(c=>{const st=u.statusPolos?.[c]||"pendente";const cl=st==="aprovado"?{bg:"#d4edda",tx:"#155724"}:st==="rejeitado"?{bg:"#f8d7da",tx:"#721c24"}:{bg:"#fff3cd",tx:"#856404"};return<span key={c} style={{background:cl.bg,color:cl.tx,fontSize:11,padding:"2px 8px",borderRadius:10,fontWeight:500}}>{c}: {st}</span>;})}</div>
              </div>
            ))}
          </>}
          {gestorTab==="leads"&&<>
            <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:500,color:"#666"}}>Leads dos seus distribuidores ({meusLeads.length})</h3>
            {meusLeads.length===0&&<p style={{color:"#aaa",fontSize:13}}>Nenhum lead ainda.</p>}
            {meusLeads.map(l=>(
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
        </div>
      </div>
    );
  }

  // ── DISTRIBUIDOR ──
  return(
    <div style={{minHeight:"100vh",background:"#f2f2f7"}}>
      <MsgBanner msg={msg}/><Modais/>
      <AppHeader session={session} logout={logout}/>
      <TabBar tabs={[["dashboard","Dashboard",0],["leads","Meus Leads",0],["ganhos","Ganhos",0],["materiais","Materiais",0],["comissoes","Comissões",0]]} active={tab} setActive={setTab}/>
      <div style={{padding:16,maxWidth:820,margin:"0 auto"}}>
        {tab==="dashboard"&&<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20}}>
            <MetricCard label="Total de leads" val={myLeads.length}/>
            <MetricCard label="Em andamento" val={myLeads.filter(l=>!["Comissão paga","Glosado"].includes(l.status)).length}/>
            <MetricCard label="Comissões previstas" val={`R$ ${totalPrev.toFixed(2)}`}/>
            <MetricCard label="Total recebido" val={`R$ ${totalPago.toFixed(2)}`}/>
          </div>
          <div style={{background:"#00e07a15",border:`1px solid ${C.green}55`,borderRadius:10,padding:"14px 16px",marginBottom:16}}>
            <p style={{margin:"0 0 4px",fontSize:13,fontWeight:500,color:"#0a5c35"}}>Como funciona</p>
            <p style={{margin:0,fontSize:12,color:"#0a5c35",lineHeight:1.6}}>1. Prospecte sua rede → 2. Cadastre o lead → 3. O aluno paga à Graduu → 4. Você recebe via PIX toda sexta-feira.</p>
          </div>
          {session?.polosSelecionados?.length>0&&<>
            <h3 style={{margin:"0 0 8px",fontSize:14,fontWeight:500,color:"#666"}}>Seus polos</h3>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>{session.polosSelecionados.map(c=>{const st=session.statusPolos?.[c]||"pendente";const cl=st==="aprovado"?{bg:"#d4edda",tx:"#155724"}:st==="rejeitado"?{bg:"#f8d7da",tx:"#721c24"}:{bg:"#fff3cd",tx:"#856404"};return<span key={c} style={{background:cl.bg,color:cl.tx,fontSize:12,padding:"4px 10px",borderRadius:10,fontWeight:500}}>{c}: {st}</span>;})}</div>
          </>}
          <h3 style={{margin:"0 0 10px",fontSize:14,fontWeight:500,color:"#666"}}>Últimos leads</h3>
          {myLeads.length===0&&<p style={{color:"#aaa",fontSize:13}}>Nenhum lead ainda.</p>}
          {myLeads.slice(-5).reverse().map(l=>(
            <div key={l.id} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:8,padding:"10px 14px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><p style={{margin:0,fontSize:13,fontWeight:500}}>{l.nome}</p><p style={{margin:0,fontSize:12,color:"#666"}}>{l.curso} · {l.criadoEm}</p></div>
              <Badge status={l.status}/>
            </div>
          ))}
        </>}
        {tab==="leads"&&<KanbanLeads leads={myLeads} onAdd={()=>setShowLeadForm(true)} showForm={showLeadForm} leadForm={leadForm} setLeadForm={setLeadForm} onSubmit={handleLeadSubmit} onCancel={()=>setShowLeadForm(false)} onMove={(lead,status)=>tentar(lead,status,showMsg)}/>}
        {tab==="ganhos"&&<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20}}>
            <MetricCard label="Leads cadastrados" val={myLeads.length}/>
            <MetricCard label="Matrículas" val={myLeads.filter(l=>["Matrícula concluída","Adesão paga","Comissão liberada","Comissão paga"].includes(l.status)).length}/>
            <MetricCard label="Comissão prevista" val={`R$ ${totalPrev.toFixed(2)}`}/>
            <MetricCard label="Total recebido" val={`R$ ${totalPago.toFixed(2)}`}/>
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
        {tab==="materiais"&&<>
          <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:500}}>Biblioteca de materiais</h3>
          {MATERIAIS.map((m,i)=>(
            <div key={i} style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{background:"#eeeeff",borderRadius:8,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:11,fontWeight:700,color:C.dark}}>{m.tipo.slice(0,3).toUpperCase()}</span></div>
                <div><p style={{margin:0,fontSize:13,fontWeight:500}}>{m.titulo}</p><p style={{margin:0,fontSize:12,color:"#666"}}>{m.desc}</p></div>
              </div>
              <button style={{background:"none",border:"1px solid #ccc",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",color:"#666"}}>Acessar</button>
            </div>
          ))}
        </>}
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
      </div>
    </div>
  );
}
