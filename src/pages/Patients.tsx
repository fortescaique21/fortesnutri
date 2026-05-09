import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Buscar pacientes com suas consultas para pegar a data da última
      const { data, error } = await supabase
        .from('pacientes')
        .select(`
          *,
          consultas (
            data_consulta
          )
        `)
        .eq('nutricionista_id', user.id)
        .order('nome');

      if (!error && data) {
        // Processar para pegar a data da última consulta
        const processed = data.map(p => {
          const lastConsult = p.consultas?.sort((a: any, b: any) => 
            new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime()
          )[0];
          
          return {
            ...p,
            lastConsultDate: lastConsult ? new Date(lastConsult.data_consulta).toLocaleDateString('pt-BR') : 'Sem consultas'
          };
        });
        setPatients(processed);
      }
      setLoading(false);
    };

    fetchPatients();
  }, [navigate]);

  const filteredPatients = patients.filter(p => 
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-container">
      <Sidebar />

      <main className="main-content">
        <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Pacientes</h1>
            <p>Gerencie seus pacientes e acompanhamentos.</p>
          </div>
          <button className="btn" style={{ width: 'auto', padding: '14px 28px' }} onClick={() => navigate('/pacientes/novo')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Novo Paciente</span>
          </button>
        </header>

        <div className="search-container">
          <input 
            type="text" 
            className="search-input" 
            placeholder="🔍 Buscar paciente pelo nome..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <section className="list-card">
          {loading ? (
            <div className="empty-state">
              <p>Carregando pacientes...</p>
            </div>
          ) : filteredPatients.length > 0 ? (
            <ul className="patient-list">
              {filteredPatients.map(patient => (
                <li 
                  key={patient.id} 
                  className="patient-item"
                  onClick={() => navigate(`/pacientes/${patient.id}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: '800' }}>
                      {patient.nome.charAt(0)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="name">{patient.nome}</span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {patient.objetivos?.join(', ') || patient.objetivo_texto || 'Objetivo não definido'}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="date" style={{ display: 'inline-block', marginBottom: '4px' }}>Última consulta</span>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{patient.lastConsultDate}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <p>{search ? '🔍 Nenhum paciente encontrado com esse nome.' : '👤 Nenhum paciente cadastrado ainda.'}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
