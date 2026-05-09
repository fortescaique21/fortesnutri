import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function NewPatient() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pessoal');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Pessoal
    nome: '',
    data_nascimento: '',
    sexo: '',
    telefone: '',
    whatsapp: '',
    email: '',
    // Clínico
    peso_inicial: '',
    altura: '',
    objetivos: [] as string[],
    objetivo_texto: '',
    nivel_atividade: '',
    patologias: [] as string[],
    restricoes_alimentares: [] as string[],
    alergias: [] as string[],
    medicamentos: '',
    suplementos: '',
    // Hábitos
    refeicoes_por_dia: '',
    horario_acorda: '',
    horario_dorme: '',
    litros_agua: '',
    atividade_fisica: false,
    atividade_fisica_descricao: '',
    observacoes: ''
  });

  // Calculados
  const [idade, setIdade] = useState<number | null>(null);
  const [imc, setImc] = useState<number | null>(null);

  useEffect(() => {
    if (formData.data_nascimento) {
      const birthDate = new Date(formData.data_nascimento);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setIdade(age);
    }
  }, [formData.data_nascimento]);

  useEffect(() => {
    const peso = parseFloat(formData.peso_inicial);
    const altura = parseFloat(formData.altura) / 100; // cm to m
    if (peso > 0 && altura > 0) {
      const calculatedImc = peso / (altura * altura);
      setImc(parseFloat(calculatedImc.toFixed(1)));
    } else {
      setImc(null);
    }
  }, [formData.peso_inicial, formData.altura]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMultiSelect = (category: string, item: string) => {
    setFormData(prev => {
      const list = (prev as any)[category] as string[];
      if (list.includes(item)) {
        return { ...prev, [category]: list.filter(i => i !== item) };
      } else {
        return { ...prev, [category]: [...list, item] };
      }
    });
  };

  const formatTime = (value: string) => {
    if (!value) return '';
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 2) return clean.padStart(2, '0') + ':00';
    if (clean.length === 3) return clean[0].padStart(2, '0') + ':' + clean.slice(1);
    return clean.slice(0, 2) + ':' + clean.slice(2, 4);
  };

  const handleTimeBlur = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: formatTime(value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) {
      alert('O nome completo é obrigatório.');
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate('/login');
      return;
    }

    // --- AUTO-CORREÇÃO: Verificar se o perfil de nutricionista existe ---
    const { data: nutriCheck } = await supabase
      .from('nutricionistas')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!nutriCheck) {
      // Se não existir, tenta criar automaticamente
      await supabase.from('nutricionistas').insert([
        { id: user.id, nome: user.user_metadata?.nome || 'Nutricionista', email: user.email }
      ]);
    }
    // -------------------------------------------------------------------

    const { data, error } = await supabase
      .from('pacientes')
      .insert({
        ...formData,
        nutricionista_id: user.id,
        data_nascimento: formData.data_nascimento || null,
        peso_inicial: formData.peso_inicial ? parseFloat(formData.peso_inicial) : null,
        altura: formData.altura ? parseFloat(formData.altura) : null,
        refeicoes_por_dia: formData.refeicoes_por_dia ? parseInt(formData.refeicoes_por_dia) : null,
        litros_agua: formData.litros_agua ? parseFloat(formData.litros_agua) : null,
        horario_acorda: formData.horario_acorda || null,
        horario_dorme: formData.horario_dorme || null,
      })
      .select()
      .single();

    if (error) {
      alert('Erro ao salvar paciente: ' + error.message);
    } else {
      setShowToast(true);
      setTimeout(() => {
        navigate(`/pacientes/${data.id}`);
      }, 2000);
    }
    setLoading(false);
  };

  return (
    <div className="app-container">
      <Sidebar />

      <main className="main-content">
        <header className="dashboard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => navigate('/pacientes')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }}>←</button>
            <h1>Novo Paciente</h1>
          </div>
          <p>Preencha as informações para cadastrar um novo paciente.</p>
        </header>

        <div className="tabs">
          <div className={`tab-item ${activeTab === 'pessoal' ? 'active' : ''}`} onClick={() => setActiveTab('pessoal')}>1. Pessoal</div>
          <div className={`tab-item ${activeTab === 'clinico' ? 'active' : ''}`} onClick={() => setActiveTab('clinico')}>2. Clínico</div>
          <div className={`tab-item ${activeTab === 'habitos' ? 'active' : ''}`} onClick={() => setActiveTab('habitos')}>3. Hábitos</div>
        </div>

        <form onSubmit={handleSubmit} className="list-card" style={{ padding: '32px' }}>
          {activeTab === 'pessoal' && (
            <div className="form-grid">
              <div className="form-group form-full">
                <label>Nome Completo *</label>
                <input name="nome" value={formData.nome} onChange={handleChange} placeholder="Ex: Maria Silva" required />
              </div>
              <div className="form-group">
                <label>Data de Nascimento</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input type="date" name="data_nascimento" value={formData.data_nascimento} onChange={handleChange} />
                  {idade !== null && <span style={{ color: 'var(--color-amethyst)', fontWeight: 600 }}>{idade} anos</span>}
                </div>
              </div>
              <div className="form-group">
                <label>Sexo</label>
                <select name="sexo" value={formData.sexo} onChange={handleChange} className="search-input" style={{ width: '100%' }}>
                  <option value="">Selecione...</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input name="telefone" value={formData.telefone} onChange={handleChange} placeholder="(00) 00000-0000" />
              </div>
              <div className="form-group">
                <label>WhatsApp</label>
                <input name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="(00) 00000-0000" />
              </div>
              <div className="form-group form-full">
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@exemplo.com" />
              </div>
              <div className="form-full" style={{ textAlign: 'right', marginTop: '20px' }}>
                <button type="button" className="btn" style={{ width: 'auto', padding: '12px 32px' }} onClick={() => setActiveTab('clinico')}>Próximo: Clínico →</button>
              </div>
            </div>
          )}

          {activeTab === 'clinico' && (
            <div className="form-grid">
              <div className="form-group">
                <label>Peso Atual (kg)</label>
                <input type="number" step="0.1" name="peso_inicial" value={formData.peso_inicial} onChange={handleChange} placeholder="0.0" />
              </div>
              <div className="form-group">
                <label>Altura (cm)</label>
                <input type="number" name="altura" value={formData.altura} onChange={handleChange} placeholder="170" />
              </div>
              {imc !== null && (
                <div className="form-group form-full" style={{ background: 'var(--color-gray-50)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>IMC Calculado:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-amethyst)', marginLeft: '8px' }}>{imc}</span>
                </div>
              )}
              
              <div className="form-group form-full">
                <label>Objetivos</label>
                <div className="multi-select-grid">
                  {['Emagrecer', 'Ganhar massa', 'Controlar diabetes', 'Saúde geral', 'Performance esportiva', 'Reeducação alimentar'].map(opt => (
                    <div key={opt} className={`checkbox-item ${formData.objetivos.includes(opt) ? 'selected' : ''}`} onClick={() => handleMultiSelect('objetivos', opt)}>
                      <input type="checkbox" checked={formData.objetivos.includes(opt)} readOnly />
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
                <input name="objetivo_texto" value={formData.objetivo_texto} onChange={handleChange} placeholder="Outro objetivo ou observação..." style={{ marginTop: '12px' }} />
              </div>

              <div className="form-group form-full">
                <label>Nível de Atividade Física</label>
                <select name="nivel_atividade" value={formData.nivel_atividade} onChange={handleChange} className="search-input" style={{ width: '100%' }}>
                  <option value="">Selecione...</option>
                  <option value="Sedentário">Sedentário</option>
                  <option value="Levemente ativo">Levemente ativo</option>
                  <option value="Moderadamente ativo">Moderadamente ativo</option>
                  <option value="Muito ativo">Muito ativo</option>
                  <option value="Extremamente ativo">Extremamente ativo</option>
                </select>
              </div>

              <div className="form-group form-full">
                <label>Patologias ou Condições</label>
                <div className="multi-select-grid">
                  {['Diabetes', 'Hipertensão', 'Hipotireoidismo', 'Hipertireoidismo', 'Síndrome do ovário policístico', 'Doença celíaca', 'Colesterol alto'].map(opt => (
                    <div key={opt} className={`checkbox-item ${formData.patologias.includes(opt) ? 'selected' : ''}`} onClick={() => handleMultiSelect('patologias', opt)}>
                      <input type="checkbox" checked={formData.patologias.includes(opt)} readOnly />
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group form-full">
                <label>Medicamentos e Suplementos</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <textarea name="medicamentos" value={formData.medicamentos} onChange={handleChange} placeholder="Medicamentos contínuos..." rows={3} className="search-input" />
                  <textarea name="suplementos" value={formData.suplementos} onChange={handleChange} placeholder="Suplementos em uso..." rows={3} className="search-input" />
                </div>
              </div>

              <div className="form-full" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <button type="button" className="btn" style={{ width: 'auto', background: 'transparent', color: 'var(--color-gray-500)', border: '1px solid var(--color-gray-200)' }} onClick={() => setActiveTab('pessoal')}>← Voltar</button>
                <button type="button" className="btn" style={{ width: 'auto', padding: '12px 32px' }} onClick={() => setActiveTab('habitos')}>Próximo: Hábitos →</button>
              </div>
            </div>
          )}

          {activeTab === 'habitos' && (
            <div className="form-grid">
              <div className="form-group">
                <label>Refeições por dia</label>
                <input type="number" name="refeicoes_por_dia" value={formData.refeicoes_por_dia} onChange={handleChange} placeholder="Ex: 5" />
              </div>
              <div className="form-group">
                <label>Quantidade de água (litros)</label>
                <input type="number" step="0.1" name="litros_agua" value={formData.litros_agua} onChange={handleChange} placeholder="Ex: 2.5" />
              </div>
              <div className="form-group">
                <label>Horário que acorda</label>
                <input name="horario_acorda" value={formData.horario_acorda} onChange={handleChange} onBlur={handleTimeBlur} placeholder="Ex: 630" />
              </div>
              <div className="form-group">
                <label>Horário que dorme</label>
                <input name="horario_dorme" value={formData.horario_dorme} onChange={handleChange} onBlur={handleTimeBlur} placeholder="Ex: 2230" />
              </div>
              
              <div className="form-group form-full">
                <label className="checkbox-item" style={{ border: 'none', background: 'transparent', padding: 0 }}>
                  <input type="checkbox" name="atividade_fisica" checked={formData.atividade_fisica} onChange={handleChange} />
                  <span>Pratica atividade física?</span>
                </label>
              </div>

              {formData.atividade_fisica && (
                <div className="form-group form-full">
                  <label>Descrição da atividade e frequência</label>
                  <input name="atividade_fisica_descricao" value={formData.atividade_fisica_descricao} onChange={handleChange} placeholder="Ex: Musculação, 4x na semana" />
                </div>
              )}

              <div className="form-group form-full">
                <label>Observações Gerais</label>
                <textarea name="observacoes" value={formData.observacoes} onChange={handleChange} rows={4} className="search-input" placeholder="Alguma informação adicional importante?" />
              </div>

              <div className="form-full" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <button type="button" className="btn" style={{ width: 'auto', background: 'transparent', color: 'var(--color-gray-500)', border: '1px solid var(--color-gray-200)' }} onClick={() => setActiveTab('clinico')}>← Voltar</button>
                <button type="submit" className="btn" style={{ width: 'auto', padding: '12px 48px' }} disabled={loading}>
                  {loading ? 'Salvando...' : 'Finalizar Cadastro'}
                </button>
              </div>
            </div>
          )}
        </form>
      </main>

      {showToast && (
        <div className="toast-success">
          Paciente cadastrado com sucesso! Redirecionando...
        </div>
      )}
    </div>
  );
}
