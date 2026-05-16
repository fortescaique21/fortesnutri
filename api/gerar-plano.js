import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dados_do_paciente } = req.body;

  if (!dados_do_paciente) {
    return res.status(400).json({ error: 'Dados do paciente são obrigatórios' });
  }

  const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Chave da API não configurada no servidor' });
  }

  try {
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
${JSON.stringify(dados_do_paciente, null, 2)}

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

    // Limpeza básica caso a IA retorne markdown
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const planoJson = JSON.parse(text);
      return res.status(200).json(planoJson);
    } catch (parseError) {
      console.error('Erro ao parsear JSON da IA:', text);
      return res.status(500).json({ error: 'A IA retornou um formato inválido. Tente novamente.', raw: text });
    }
  } catch (error) {
    console.error('Erro na função serverless:', error);
    return res.status(500).json({ error: 'Erro ao gerar plano alimentar', details: error.message });
  }
}
