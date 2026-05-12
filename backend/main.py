import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import AsyncOpenAI

app = FastAPI(title="Jarvis AI OS API", version="1.0.0")

# Instância assíncrona da OpenAI configurada para o OLLAMA LOCAL
client = AsyncOpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama" # O SDK exige uma chave, mas o Ollama ignora
)

# Permitir comunicação com o frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.get("/")
def read_root():
    return {"status": "online", "system": "Jarvis", "message": "Sistemas online e aguardando comandos, mestre."}

@app.post("/api/chat")
async def chat_with_jarvis(request: ChatRequest):
    user_message = request.message
    
    # Detecção de ação de mapa baseada em palavras-chave
    action = "none"
    if "mapa" in user_message.lower() or "inundação" in user_message.lower():
        action = "render_flood_map"

    # Criando o contexto do Jarvis (System Prompt)
    system_prompt = (
        "Você é o J.A.R.V.I.S., um assistente de inteligência artificial altamente avançado. "
        "Você é genérico, multidisciplinar e capaz de ajudar com absolutamente qualquer tarefa. "
        "Responda de forma concisa, inteligente, educada, e com um tom futurista/tecnológico. "
        "Chame o usuário de 'Mestre' ou 'Senhor'."
    )

    try:
        # Comunicação com a IA Local (Ollama)
        response = await client.chat.completions.create(
            model="llama3", # O modelo que você baixar rodando `ollama run llama3`
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            max_tokens=400,
            temperature=0.7
        )
        
        reply_text = response.choices[0].message.content
        
        return {
            "reply": reply_text,
            "action": action
        }
    except Exception as e:
        return {
            "reply": "Erro crítico. Falha ao comunicar com o núcleo local do Ollama. Verifique se o servidor do Ollama está rodando na porta 11434.",
            "action": "none"
        }
