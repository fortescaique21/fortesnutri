import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/gerar-plano' && req.method === 'POST') {
            console.log('--- Chamada de API Local: Gerando Plano Alimentar ---');
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const { dados_do_paciente } = JSON.parse(body);
                console.log('Paciente:', dados_do_paciente?.nome);
                const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY;

                if (!apiKey) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'Chave API não encontrada' }));
                  return;
                }

                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

                const prompt = `
Você é um nutricionista profissional.
Gere um plano alimentar semanal com base nos dados abaixo.
⚠️ Regras:
- Responda APENAS em JSON válido
- Não use markdown
- Não escreva explicações
- Respeite restrições e alergias

Dados do paciente:
${JSON.stringify(dados_do_paciente)}

Formato obrigatório:
{
  "plano_semanal": [
    {
      "dia": "Segunda-feira",
      "refeicoes": {
        "cafe_da_manha": { "opcoes": ["", "", "", "", ""], "imagem_tag": "vector food doodle breakfast" },
        "lanche_manha": { "opcoes": ["", "", "", "", ""], "imagem_tag": "vector food doodle snack" },
        "almoco": { "opcoes": ["", "", "", "", ""], "imagem_tag": "vector food doodle lunch" },
        "lanche_tarde": { "opcoes": ["", "", "", "", ""], "imagem_tag": "vector food doodle fruit" },
        "jantar": { "opcoes": ["", "", "", "", ""], "imagem_tag": "vector food doodle dinner" }
      }
    }
  ]
}
Regras Cruciais:
- OBRIGATÓRIO gerar o plano para TODOS OS 7 DIAS da semana.
- Cada dia DEVE conter OBRIGATORIAMENTE as 5 refeições: cafe_da_manha, lanche_manha, almoco, lanche_tarde e jantar.
- É PROIBIDO omitir qualquer uma dessas 5 refeições em qualquer dia.
- Cada refeição DEVE conter 5 OPÇÕES diferentes e completas (totalizando 5 strings no array).
- Proibido deixar campos vazios. Preencha tudo com alimentos variados.
`;
                
                const result = await model.generateContent(prompt);
                const response = await result.response;
                let text = response.text();
                text = text.replace(/```json/g, '').replace(/```/g, '').trim();

                console.log('IA respondeu com sucesso!');
                res.setHeader('Content-Type', 'application/json');
                res.end(text);
              } catch (err: any) {
                console.error('ERRO NA API LOCAL:', err.message);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
          next();
        });
      }
    }
  ],
})
