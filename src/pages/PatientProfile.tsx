import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  User, Clipboard, Utensils, Save, Plus, ArrowLeft, 
  Calendar, CheckCircle2, X 
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function PatientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // States
  const [patient, setPatient] = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pessoal' | 'clinico' | 'habitos' | 'plano_ia'>('pessoal');
  const [showModal, setShowModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // IA Meal Plan State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [selectedPlanView, setSelectedPlanView] = useState<any>(null);

  // New Consultation Form State
  const [newConsultation, setNewConsultation] = useState({
    data_consulta: new Date().toISOString().split('T')[0],
    peso: '',
    cintura: '',
    quadril: '',
    percentual_gordura: '',
    observacoes: '',
    proximo_retorno: ''
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Patient
      const { data: pData, error: pError } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .single();
      if (pError) throw pError;
      setPatient(pData);

      // Fetch Consultations
      const { data: cData, error: cError } = await supabase
        .from('consultas')
        .select('*')
        .eq('paciente_id', id)
        .order('data_consulta', { ascending: false });
      if (cError) throw cError;
      setConsultations(cData || []);

      // Fetch Plans
      const { data: plData, error: plError } = await supabase
        .from('planos_alimentares')
        .select('*')
        .eq('paciente_id', id)
        .order('created_at', { ascending: false });
      if (plError) throw plError;
      setPlans(plData || []);
      
      // Auto-load latest plan into editor if available
      if (plData && plData.length > 0 && !generatedPlan) {
        setGeneratedPlan(plData[0].conteudo);
        setEditingPlanId(plData[0].id);
      }

    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      showNotify('error', 'Erro ao carregar dados do paciente.');
    } finally {
      setLoading(false);
    }
  };

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSavePatient = async () => {
    try {
      // Remove metadata before saving if any
      const { id: patientId, created_at, ...updateData } = patient;
      
      // Sanitize date and numeric fields
      const sanitizedData = {
        ...updateData,
        data_nascimento: updateData.data_nascimento || null,
        peso_inicial: updateData.peso_inicial ? parseFloat(updateData.peso_inicial) : null,
        altura: updateData.altura ? parseFloat(updateData.altura) : null,
        litros_agua: updateData.litros_agua ? parseFloat(updateData.litros_agua) : null,
        horario_acorda: updateData.horario_acorda || null,
        horario_dorme: updateData.horario_dorme || null,
      };
      
      const { error } = await supabase
        .from('pacientes')
        .update(sanitizedData)
        .eq('id', id);
      
      if (error) throw error;
      showNotify('success', 'Alterações salvas com sucesso!');
    } catch (error) {
      console.error(error);
      showNotify('error', 'Erro ao salvar alterações.');
    }
  };

  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sanitizedConsultation = {
        ...newConsultation,
        paciente_id: id,
        cintura: newConsultation.cintura ? parseFloat(newConsultation.cintura) : null,
        quadril: newConsultation.quadril ? parseFloat(newConsultation.quadril) : null,
        percentual_gordura: newConsultation.percentual_gordura ? parseFloat(newConsultation.percentual_gordura) : null,
        proximo_retorno: newConsultation.proximo_retorno || null
      };

      const { error } = await supabase
        .from('consultas')
        .insert([sanitizedConsultation]);

      if (error) throw error;

      showNotify('success', 'Consulta registrada com sucesso!');
      setShowModal(false);
      setNewConsultation({
        data_consulta: new Date().toISOString().split('T')[0],
        peso: '',
        cintura: '',
        quadril: '',
        percentual_gordura: '',
        observacoes: '',
        proximo_retorno: ''
      });
      fetchData();
    } catch (error) {
      showNotify('error', 'Erro ao salvar consulta.');
    }
  };

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    setEditingPlanId(null); // Reset ID to create a new one upon saving
    try {
      const response = await fetch('/api/gerar-plano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dados_do_paciente: patient })
      });

      if (!response.ok) throw new Error('Erro na geração do plano');

      const data = await response.json();
      setGeneratedPlan(data);
      setActiveTab('plano_ia');
      showNotify('success', 'Plano alimentar gerado com sucesso!');
    } catch (error) {
      console.error(error);
      showNotify('error', 'Falha ao gerar plano com IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGeneratedPlan = async () => {
    try {
      if (editingPlanId) {
        // Update existing plan
        const { error } = await supabase
          .from('planos_alimentares')
          .update({ conteudo: generatedPlan })
          .eq('id', editingPlanId);
        if (error) throw error;
        showNotify('success', 'Plano alimentar atualizado com sucesso!');
      } else {
        // Insert new plan
        const { error } = await supabase
          .from('planos_alimentares')
          .insert([{
            paciente_id: id,
            conteudo: generatedPlan
          }]);
        if (error) throw error;
        showNotify('success', 'Plano alimentar salvo com sucesso!');
      }

      fetchData(); // Refresh history
    } catch (error) {
      console.error(error);
      showNotify('error', 'Erro ao salvar plano alimentar.');
    }
  };

  const handleEditPlanValue = (dayIndex: number, mealType: string, optionIndex: number, newValue: string) => {
    const updatedPlan = { ...generatedPlan };
    const meal = updatedPlan.plano_semanal[dayIndex].refeicoes[mealType];
    
    if (Array.isArray(meal)) {
      updatedPlan.plano_semanal[dayIndex].refeicoes[mealType][optionIndex] = newValue;
    } else {
      updatedPlan.plano_semanal[dayIndex].refeicoes[mealType].opcoes[optionIndex] = newValue;
    }
    
    setGeneratedPlan(updatedPlan);
  };

  // Chart Data (sorted ascending for the chart)
  const chartData = [...consultations]
    .sort((a, b) => new Date(a.data_consulta).getTime() - new Date(b.data_consulta).getTime())
    .map(c => {
      const peso = parseFloat(c.peso);
      const alturaM = (patient?.altura || 0) / 100;
      const imc = (peso && alturaM) ? (peso / (alturaM * alturaM)).toFixed(1) : 0;
      
      return {
        data: new Date(c.data_consulta).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        peso: peso,
        gordura: parseFloat(c.percentual_gordura) || 0,
        imc: parseFloat(imc as string)
      };
    });

  // Calculate Metrics
  const lastConsult = consultations[0];
  const firstConsult = consultations[consultations.length - 1];
  const weightDiff = (lastConsult && firstConsult) ? (parseFloat(lastConsult.peso) - parseFloat(firstConsult.peso)).toFixed(1) : 0;
  
  const currentImc = (lastConsult && patient?.altura) 
    ? (parseFloat(lastConsult.peso) / Math.pow(patient.altura/100, 2)).toFixed(1)
    : (patient?.peso_inicial && patient?.altura)
    ? (parseFloat(patient.peso_inicial) / Math.pow(patient.altura/100, 2)).toFixed(1)
    : '-';

  if (loading) return <div className="empty-state">Carregando perfil...</div>;

  return (
    <div className="app-container">
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <Sidebar />

      <main className="main-content">
        <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <button onClick={() => navigate('/pacientes')} className="tab-btn" style={{ padding: '8px' }}>
                <ArrowLeft size={24} />
              </button>
              <h1>{patient?.nome}</h1>
            </div>
            <p>Perfil e histórico completo do paciente.</p>
          </div>
          <button className="btn" style={{ width: 'auto' }} onClick={() => setShowModal(true)}>
            <Plus size={20} /> Nova Consulta
          </button>
        </header>

        {/* SECTION 1: DADOS DO PACIENTE */}
        <section className="list-card mb-4">
          <div className="section-header">
            <h3><User size={20} /> Dados do Paciente</h3>
            <button className="btn" style={{ width: 'auto', padding: '8px 16px' }} onClick={handleSavePatient}>
              <Save size={18} /> Salvar Alterações
            </button>
          </div>

          <div className="tabs-nav">
            <button 
              className={`tab-btn ${activeTab === 'pessoal' ? 'active' : ''}`}
              onClick={() => setActiveTab('pessoal')}
            >
              Pessoal
            </button>
            <button 
              className={`tab-btn ${activeTab === 'clinico' ? 'active' : ''}`}
              onClick={() => setActiveTab('clinico')}
            >
              Clínico
            </button>
            <button 
              className={`tab-btn ${activeTab === 'habitos' ? 'active' : ''}`}
              onClick={() => setActiveTab('habitos')}
            >
              Hábitos
            </button>
            <button 
              className={`tab-btn ${activeTab === 'plano_ia' ? 'active' : ''}`}
              onClick={() => setActiveTab('plano_ia')}
            >
              Plano IA {generatedPlan && <span className="badge-new">Novo</span>}
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'pessoal' && (
              <div className="editable-grid">
                <div className="field-group">
                  <label>Nome Completo</label>
                  <input 
                    className="field-input" 
                    value={patient?.nome || ''} 
                    onChange={e => setPatient({...patient, nome: e.target.value})}
                  />
                </div>
                <div className="field-group">
                  <label>Email</label>
                  <input 
                    className="field-input" 
                    value={patient?.email || ''} 
                    onChange={e => setPatient({...patient, email: e.target.value})}
                  />
                </div>
                <div className="field-group">
                  <label>Telefone</label>
                  <input 
                    className="field-input" 
                    value={patient?.telefone || ''} 
                    onChange={e => setPatient({...patient, telefone: e.target.value})}
                  />
                </div>
                <div className="field-group">
                  <label>WhatsApp</label>
                  <input 
                    className="field-input" 
                    value={patient?.whatsapp || ''} 
                    onChange={e => setPatient({...patient, whatsapp: e.target.value})}
                  />
                </div>
                <div className="field-group">
                  <label>Data de Nascimento</label>
                  <input 
                    type="date"
                    className="field-input" 
                    value={patient?.data_nascimento || ''} 
                    onChange={e => setPatient({...patient, data_nascimento: e.target.value})}
                  />
                </div>
                <div className="field-group">
                  <label>Sexo</label>
                  <select 
                    className="field-input" 
                    value={patient?.sexo || ''} 
                    onChange={e => setPatient({...patient, sexo: e.target.value})}
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="O">Outro</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'clinico' && (
              <div className="editable-grid">
                <div className="field-group">
                  <label>Peso Inicial (kg)</label>
                  <input 
                    type="number"
                    className="field-input" 
                    value={patient?.peso_inicial || ''} 
                    onChange={e => setPatient({...patient, peso_inicial: e.target.value})}
                  />
                </div>
                <div className="field-group">
                  <label>Altura (cm)</label>
                  <input 
                    type="number"
                    className="field-input" 
                    value={patient?.altura || ''} 
                    onChange={e => setPatient({...patient, altura: e.target.value})}
                  />
                </div>
                <div className="field-group" style={{ gridColumn: 'span 2' }}>
                  <label>Objetivos</label>
                  <textarea 
                    className="field-input" 
                    rows={3}
                    value={patient?.objetivo_texto || ''} 
                    onChange={e => setPatient({...patient, objetivo_texto: e.target.value})}
                  />
                </div>
                <div className="field-group" style={{ gridColumn: 'span 2' }}>
                  <label>Patologias / Condições</label>
                  <input 
                    className="field-input" 
                    value={patient?.medicamentos || ''} 
                    placeholder="Medicamentos e patologias..."
                    onChange={e => setPatient({...patient, medicamentos: e.target.value})}
                  />
                </div>
              </div>
            )}

            {activeTab === 'habitos' && (
              <div className="editable-grid">
                <div className="field-group">
                  <label>Nível de Atividade</label>
                  <select 
                    className="field-input" 
                    value={patient?.nivel_atividade || ''} 
                    onChange={e => setPatient({...patient, nivel_atividade: e.target.value})}
                  >
                    <option value="sedentario">Sedentário</option>
                    <option value="leve">Levemente Ativo</option>
                    <option value="moderado">Moderadamente Ativo</option>
                    <option value="intenso">Muito Ativo</option>
                  </select>
                </div>
                <div className="field-group">
                  <label>Litros de Água/Dia</label>
                  <input 
                    type="number"
                    className="field-input" 
                    value={patient?.litros_agua || ''} 
                    onChange={e => setPatient({...patient, litros_agua: e.target.value})}
                  />
                </div>
                <div className="field-group">
                  <label>Horário Acorda</label>
                  <input 
                    type="time"
                    className="field-input" 
                    value={patient?.horario_acorda || ''} 
                    onChange={e => setPatient({...patient, horario_acorda: e.target.value})}
                  />
                </div>
                <div className="field-group">
                  <label>Horário Dorme</label>
                  <input 
                    type="time"
                    className="field-input" 
                    value={patient?.horario_dorme || ''} 
                    onChange={e => setPatient({...patient, horario_dorme: e.target.value})}
                  />
                </div>
                <div className="field-group" style={{ gridColumn: 'span 2' }}>
                  <label>Observações Gerais</label>
                  <textarea 
                    className="field-input" 
                    rows={3}
                    value={patient?.observacoes || ''} 
                    onChange={e => setPatient({...patient, observacoes: e.target.value})}
                  />
                </div>
              </div>
            )}

            {activeTab === 'plano_ia' && (
              <div className="plano-ia-container">
                {!generatedPlan && !isGenerating && (
                  <div className="empty-state py-8">
                    <Utensils size={48} className="mb-4 opacity-20" />
                    <p>Gere um plano alimentar personalizado usando Inteligência Artificial.</p>
                    <button className="btn mt-4" onClick={handleGeneratePlan} style={{ width: 'auto' }}>
                      Gerar Agora
                    </button>
                  </div>
                )}

                {isGenerating && (
                  <div className="empty-state py-8">
                    <div className="loader mb-4"></div>
                    <p>O Gemini está criando um plano personalizado...</p>
                    <span className="text-muted text-sm">Isso pode levar alguns segundos.</span>
                  </div>
                )}

                {generatedPlan && (
                  <div className="plan-editor-container" style={{ animation: 'slideUp 0.5s ease-out' }}>
                    <div className="section-header mb-6">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '12px' }}>
                          <Utensils size={24} color="var(--primary)" />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Editor de Plano Alimentar</h4>
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn btn-outline" onClick={() => { setGeneratedPlan(null); setEditingPlanId(null); }} style={{ width: 'auto', padding: '10px 20px' }}>
                          Descartar
                        </button>
                        <button className="btn" onClick={handleSaveGeneratedPlan} style={{ width: 'auto', padding: '10px 24px' }}>
                          <Save size={20} /> {editingPlanId ? 'Atualizar Plano' : 'Salvar Novo Plano'}
                        </button>
                      </div>
                    </div>

                    <div className="days-scroll" style={{ display: 'flex', gap: '24px', overflowX: 'auto', padding: '10px 10px 40px', scrollSnapType: 'x proximity' }}>
                      {generatedPlan.plano_semanal.map((dia: any, dIdx: number) => (
                        <div key={dIdx} className="day-card-ia" style={{ scrollSnapAlign: 'start' }}>
                          <h5 style={{ fontSize: '1.3rem', marginBottom: '24px', color: 'var(--primary)', fontWeight: 800, borderBottom: '2px solid rgba(16, 185, 129, 0.1)', paddingBottom: '12px' }}>
                            {dia.dia}
                          </h5>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                            {Object.entries(dia.refeicoes).map(([mealKey, data]: [string, any]) => {
                              const options = Array.isArray(data) ? data : (data.opcoes || []);
                              
                              const getMealPhoto = (key: string) => {
                                const k = key.toLowerCase();
                                let photoId = 'photo-1490818387583-1baba5e638af';
                                if (k.includes('cafe')) photoId = 'photo-1493770348161-369560ae357d';
                                if (k.includes('lanche_manha')) photoId = 'photo-1455243627921-9fce66b3981a';
                                if (k.includes('lanche_tarde')) photoId = 'photo-1540189549336-e6e99c3679fe';
                                if (k.includes('lanche') && !photoId) photoId = 'photo-1455243627921-9fce66b3981a';
                                if (k.includes('almoco')) photoId = 'photo-1546069901-ba9599a7e63c';
                                if (k.includes('jantar')) photoId = 'photo-1512621776951-a57141f2eefd';
                                return `https://images.unsplash.com/${photoId}?w=150&h=150&fit=crop&q=80`;
                              };

                              const imageUrl = getMealPhoto(mealKey);

                              return (
                                <div key={mealKey} className="meal-group-ia">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                                    <div className="floating-image" style={{ 
                                      width: '64px', 
                                      height: '64px', 
                                      borderRadius: '16px',
                                      overflow: 'hidden',
                                      flexShrink: 0,
                                      boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                                      border: '3px solid white',
                                      background: '#f1f5f9'
                                    }}>
                                      <img 
                                        src={imageUrl} 
                                        alt={mealKey} 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        loading="lazy"
                                        onError={(e: any) => {
                                          e.target.style.display = 'none';
                                          e.target.parentElement.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px">🥗</div>';
                                        }}
                                      />
                                    </div>
                                    <label style={{ 
                                      display: 'block', 
                                      fontSize: '1.1rem', 
                                      fontWeight: 800, 
                                      textTransform: 'capitalize', 
                                      color: 'var(--text-main)', 
                                      margin: 0,
                                      fontFamily: 'var(--font-heading)'
                                    }}>
                                      {mealKey.replace(/_/g, ' ')}
                                    </label>
                                  </div>
                                  
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {options.map((opt: string, oIdx: number) => (
                                      <input 
                                        key={oIdx}
                                        className="plan-meal-input"
                                        value={opt}
                                        onChange={(e) => handleEditPlanValue(dIdx, mealKey, oIdx, e.target.value)}
                                        placeholder="Digite uma opção de alimento..."
                                      />
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: CONSULTAS */}
        <section className="list-card mb-4">
          <div className="section-header">
            <h3><Clipboard size={20} /> Evolução Clínica</h3>
          </div>

          <div className="metrics-summary-grid">
            <div className="metric-mini-card">
              <span className="label">IMC Atual</span>
              <span className="value">{currentImc}</span>
              <span className="subtext">Índice de Massa Corporal</span>
            </div>
            <div className="metric-mini-card">
              <span className="label">Variação de Peso</span>
              <span className={`value ${Number(weightDiff) < 0 ? 'negative' : 'positive'}`}>
                {Number(weightDiff) > 0 ? '+' : ''}{weightDiff} kg
              </span>
              <span className="subtext">Desde a primeira consulta</span>
            </div>
            <div className="metric-mini-card">
              <span className="label">Último % Gordura</span>
              <span className="value">{lastConsult?.percentual_gordura || '-'}%</span>
              <span className="subtext">Composição corporal</span>
            </div>
          </div>

          <div className="chart-container" style={{ height: '400px' }}>
            {consultations.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorGordura" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis 
                    dataKey="data" 
                    stroke="var(--text-muted)" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="var(--text-muted)" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    unit="kg" 
                    domain={['dataMin - 2', 'dataMax + 2']} 
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#f59e0b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    unit="%" 
                    domain={[0, 'dataMax + 5']} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: 'var(--shadow-lg)',
                      background: 'var(--surface)',
                      color: 'var(--text-main)'
                    }}
                    itemStyle={{ fontWeight: 700 }}
                  />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="peso" 
                    name="Peso (kg)"
                    stroke="var(--primary)" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorPeso)"
                    dot={{ fill: 'var(--primary)', r: 6, strokeWidth: 3, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="gordura" 
                    name="% Gordura"
                    stroke="#f59e0b" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorGordura)"
                    dot={{ fill: '#f59e0b', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Nenhuma consulta registrada ainda.
              </div>
            )}
          </div>

          <div className="consultation-table-wrapper">
            <table className="consultation-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Peso</th>
                  <th>Cintura</th>
                  <th>Quadril</th>
                  <th>% Gordura</th>
                  <th>Próximo Retorno</th>
                  <th>Obs.</th>
                </tr>
              </thead>
              <tbody>
                {consultations.map((c) => (
                  <tr key={c.id} className="consultation-row">
                    <td style={{ fontWeight: 600 }}>{new Date(c.data_consulta).toLocaleDateString('pt-BR')}</td>
                    <td>{c.peso} kg</td>
                    <td>{c.cintura || '-'} cm</td>
                    <td>{c.quadril || '-'} cm</td>
                    <td>{c.percentual_gordura || '-'}%</td>
                    <td>{c.proximo_retorno ? new Date(c.proximo_retorno).toLocaleDateString('pt-BR') : '-'}</td>
                    <td title={c.observacoes} style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.observacoes || '-'}
                    </td>
                  </tr>
                ))}
                {consultations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty-state">Sem histórico de consultas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 3: PLANOS ALIMENTARES */}
        <section className="list-card">
          <div className="section-header">
            <h3><Utensils size={20} /> Planos Alimentares</h3>
            <button 
              className="btn" 
              style={{ width: 'auto' }} 
              onClick={handleGeneratePlan}
              disabled={isGenerating}
            >
              {isGenerating ? 'Gerando...' : 'Gerar Plano Alimentar'}
            </button>
          </div>

          <div className="history-list">
            {plans.map((plan) => (
              <div 
                key={plan.id} 
                className="history-item cursor-pointer"
                onClick={() => {
                  setSelectedPlanView(plan.conteudo);
                  setActiveTab('plano_ia');
                  setGeneratedPlan(plan.conteudo);
                  setEditingPlanId(plan.id);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Calendar size={18} className="text-muted" />
                  <div>
                    <div style={{ fontWeight: 600 }}>Plano Gerado em {new Date(plan.created_at).toLocaleDateString('pt-BR')}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Versão arquivada</div>
                  </div>
                </div>
                <CheckCircle2 size={20} color="var(--accent)" />
              </div>
            ))}
            {plans.length === 0 && (
              <div className="empty-state">Nenhum plano alimentar gerado ainda.</div>
            )}
          </div>
        </section>
      </main>

      {/* MODAL: NOVA CONSULTA */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Nova Consulta</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><X /></button>
            </div>
            
            <form onSubmit={handleSaveConsultation}>
              <div className="editable-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="field-group">
                  <label>Data da Consulta</label>
                  <input 
                    type="date"
                    className="field-input"
                    required
                    value={newConsultation.data_consulta}
                    onChange={e => setNewConsultation({...newConsultation, data_consulta: e.target.value})}
                  />
                </div>
                <div className="field-group">
                  <label>Peso Atual (kg)</label>
                  <input 
                    type="number"
                    step="0.1"
                    className="field-input"
                    required
                    value={newConsultation.peso}
                    onChange={e => setNewConsultation({...newConsultation, peso: e.target.value})}
                  />
                </div>
                <div className="field-group">
                  <label>Cintura (cm)</label>
                  <input 
                    type="number"
                    className="field-input"
                    value={newConsultation.cintura}
                    onChange={e => setNewConsultation({...newConsultation, cintura: e.target.value})}
                  />
                </div>
                <div className="field-group">
                  <label>Quadril (cm)</label>
                  <input 
                    type="number"
                    className="field-input"
                    value={newConsultation.quadril}
                    onChange={e => setNewConsultation({...newConsultation, quadril: e.target.value})}
                  />
                </div>
                <div className="field-group">
                  <label>% de Gordura</label>
                  <input 
                    type="number"
                    step="0.1"
                    className="field-input"
                    value={newConsultation.percentual_gordura}
                    onChange={e => setNewConsultation({...newConsultation, percentual_gordura: e.target.value})}
                  />
                </div>
                <div className="field-group">
                  <label>Próximo Retorno</label>
                  <input 
                    type="date"
                    className="field-input"
                    value={newConsultation.proximo_retorno}
                    onChange={e => setNewConsultation({...newConsultation, proximo_retorno: e.target.value})}
                  />
                </div>
                <div className="field-group" style={{ gridColumn: 'span 2' }}>
                  <label>Observações</label>
                  <textarea 
                    className="field-input"
                    rows={3}
                    value={newConsultation.observacoes}
                    onChange={e => setNewConsultation({...newConsultation, observacoes: e.target.value})}
                  />
                </div>
              </div>

              <div className="mt-4">
                <button type="submit" className="btn">
                  Salvar Consulta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
