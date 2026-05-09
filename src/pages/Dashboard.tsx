import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function Dashboard() {
  const [nutricionista, setNutricionista] = useState<any>(null);
  const [stats, setStats] = useState({
    totalPacientes: 0,
    consultasSemana: 0,
    pacientesSemRetorno: [] as any[]
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // 1. Perfil da Nutricionista
      const { data: nutriData } = await supabase
        .from('nutricionistas')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (nutriData) {
        setNutricionista(nutriData);
      } else {
        // Auto-fix: Criar perfil se não existir
        const newNutri = { id: user.id, nome: user.user_metadata?.nome || 'Nutricionista', email: user.email };
        await supabase.from('nutricionistas').insert([newNutri]);
        setNutricionista(newNutri);
      }

      // 2. Total de Pacientes
      const { count: totalPacientes } = await supabase
        .from('pacientes')
        .select('*', { count: 'exact', head: true })
        .eq('nutricionista_id', user.id);

      // 3. Consultas da Semana
      const today = new Date();
      const firstDay = new Date(today.setDate(today.getDate() - today.getDay())); // Domingo
      const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6)); // Sábado
      
      const { data: consultasData } = await supabase
        .from('consultas')
        .select('*, pacientes!inner(nutricionista_id)')
        .eq('pacientes.nutricionista_id', user.id)
        .gte('data_consulta', firstDay.toISOString().split('T')[0])
        .lte('data_consulta', lastDay.toISOString().split('T')[0]);

      // 4. Pacientes sem Retorno (> 30 dias e sem agendamento futuro)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thresholdDate = thirtyDaysAgo.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      // Buscar pacientes com suas consultas
      const { data: patientsWithConsultations } = await supabase
        .from('pacientes')
        .select('id, nome, consultas(data_consulta, proximo_retorno)')
        .eq('nutricionista_id', user.id);

      const semRetorno = patientsWithConsultations?.filter(p => {
        if (!p.consultas || p.consultas.length === 0) return false;

        // Encontrar a consulta mais recente
        const sortedConsultations = [...p.consultas].sort((a: any, b: any) => 
          new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime()
        );
        
        const lastConsultation = sortedConsultations[0];
        const hasFutureReturn = p.consultas.some((c: any) => c.proximo_retorno && c.proximo_retorno >= todayStr);

        return lastConsultation.data_consulta < thresholdDate && !hasFutureReturn;
      }) || [];

      setStats({
        totalPacientes: totalPacientes || 0,
        consultasSemana: consultasData?.length || 0,
        pacientesSemRetorno: semRetorno
      });

      setLoading(false);
    };

    loadDashboardData();
  }, [navigate]);

  if (loading) {
    return <div className="auth-container">Carregando dashboard...</div>;
  }

  return (
    <div className="app-container">
      <Sidebar />

      {/* Main Content */}
      <main className="main-content">
        <header className="dashboard-header">
          <h1>Olá, Dra. {nutricionista?.nome?.split(' ')[0] || 'Nutricionista'} ✨</h1>
          <p>Veja o que está acontecendo hoje no seu consultório.</p>
        </header>

        {/* Stats Grid */}
        <section className="stats-grid">
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3>Total de Pacientes</h3>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '8px', borderRadius: '12px', color: 'var(--primary)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
              </div>
            </div>
            <div className="stat-value">{stats.totalPacientes}</div>
            <p className="stat-desc">Pacientes ativos no sistema</p>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3>Consultas da Semana</h3>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '8px', borderRadius: '12px', color: 'var(--secondary)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </div>
            </div>
            <div className="stat-value">{stats.consultasSemana}</div>
            <p className="stat-desc">Agendadas para esta semana</p>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3>Taxa de Retenção</h3>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '12px', color: 'var(--accent)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
            </div>
            <div className="stat-value">
              {stats.totalPacientes > 0 
                ? Math.round(((stats.totalPacientes - stats.pacientesSemRetorno.length) / stats.totalPacientes) * 100) 
                : 0}%
            </div>
            <p className="stat-desc">Pacientes com acompanhamento ativo</p>
          </div>
        </section>

        {/* Patients Without Return */}
        <section className="list-card">
          <h3>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--error)' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Pacientes sem Retorno (&gt; 30 dias)
          </h3>
          {stats.pacientesSemRetorno.length > 0 ? (
            <ul className="patient-list">
              {stats.pacientesSemRetorno.map(patient => (
                <li 
                  key={patient.id} 
                  className="patient-item"
                  onClick={() => navigate(`/pacientes/${patient.id}`)}
                >
                  <span className="name">{patient.nome}</span>
                  <span className="date">Última consulta há mais de 1 mês</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <p>🎉 Tudo em dia! Todos os pacientes estão com retornos agendados.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
