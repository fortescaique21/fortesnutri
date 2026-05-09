# 🌿 FortesNutri - Sistema de Nutrição Premium

O **FortesNutri** é uma plataforma moderna e luxuosa para gestão de consultórios de nutrição. Desenvolvido com foco em alta performance e estética refinada, o sistema permite que nutricionistas acompanhem a evolução clínica de seus pacientes de forma intuitiva, segura e visualmente impactante.

---

## ✨ Funcionalidades Principais

- **Dashboard Clínico**: Visão geral de pacientes e métricas rápidas.
- **Gráficos de Evolução Modernos**: Acompanhamento visual de peso, % de gordura e IMC com gráficos de área e gradientes.
- **Gestão de Pacientes**: Cadastro completo incluindo dados pessoais, clínicos e hábitos alimentares.
- **Modo Escuro (Dark Mode)**: Interface adaptável para maior conforto visual, com persistência de preferência.
- **Autenticação Segura**: Sistema de login e cadastro integrado via Supabase.
- **Design Premium**: Identidade visual baseada em tons de verde esmeralda e estética "glassmorphism".

---

## 🛠️ Tecnologias Utilizadas

O projeto foi construído utilizando as tecnologias mais modernas do ecossistema web:

- **React + Vite**: Para um ambiente de desenvolvimento ultra-rápido.
- **TypeScript**: Garantindo robustez e tipagem estática ao código.
- **Supabase**: Backend-as-a-Service para autenticação e banco de dados PostgreSQL em tempo real.
- **Recharts**: Para visualização de dados complexos com gráficos interativos.
- **Lucide React**: Biblioteca de ícones modernos e minimalistas.
- **CSS3 (Custom Design System)**: Sistema de design exclusivo construído do zero, sem frameworks utilitários, para máximo controle estético.

---

## 🚀 Processo de Desenvolvimento

O desenvolvimento do **FortesNutri** seguiu premissas de design de alta fidelidade:

1.  **Arquitetura SPA**: Implementação de roteamento client-side para transições instantâneas entre páginas.
2.  **Foco em UX/UI**: Uso de tokens de design consistentes, micro-animações e uma paleta de cores curada para transmitir profissionalismo e saúde.
3.  **Segurança e Dados**: Estruturação de banco de dados relacional para gerenciar consultas e perfis de pacientes, com validações automáticas de integridade.
4.  **Responsividade**: Layout totalmente adaptável para desktops e tablets.

---

## ⚙️ Como Executar o Projeto

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/fortescaique21/fortesnutri.git
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure as variáveis de ambiente:**
    Crie um arquivo `.env` na raiz do projeto com as suas chaves do Supabase:
    ```env
    VITE_SUPABASE_URL=sua_url_aqui
    VITE_SUPABASE_ANON_KEY=sua_chave_aqui
    ```

4.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

---

## 👤 Autor

Desenvolvido por **Caique Fortes** (FortesNutri).

---

*Este projeto foi desenvolvido com foco em modernizar a experiência de atendimento nutricional.*
