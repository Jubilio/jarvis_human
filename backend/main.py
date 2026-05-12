import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import AsyncOpenAI
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

app = FastAPI(title="Jarvis Humanitário API", version="1.0.0")

# Instância assíncrona da OpenAI
# Ela buscará automaticamente a variável OPENAI_API_KEY
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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
    
    # Detecção de ação de mapa baseada em palavras-chave (futuramente isso será um Tool/Function Calling)
    action = "none"
    if "mapa" in user_message.lower() or "inundação" in user_message.lower():
        action = "render_flood_map"

    # Criando o contexto do Jarvis (System Prompt)
    system_prompt = (
        "Você é o J.A.R.V.I.S., um assistente de inteligência artificial altamente avançado, "
        "focado em operações humanitárias e análise GIS. Responda de forma concisa, educada, "
        "e com um tom futurista/tecnológico, como o assistente do Homem de Ferro. Chame o usuário de 'Mestre' ou 'Senhor'."
    )

    try:
        # Verifica se a chave foi configurada
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key or api_key == "sk-sua-chave-aqui" or api_key == "":
            return {
                "reply": "Atenção: Minha chave de API (OPENAI_API_KEY) não está configurada no arquivo .env do backend. Por favor, adicione-a para ligar minhas redes neurais.",
                "action": "none"
            }

        # Comunicação com a OpenAI
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo", # Pode trocar para gpt-4o se desejar
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            max_tokens=250,
            temperature=0.7
        )
        
        reply_text = response.choices[0].message.content
        
        return {
            "reply": reply_text,
            "action": action
        }
    except Exception as e:
        return {
            "reply": f"Erro crítico nos sistemas de comunicação neural: {str(e)}",
            "action": "none"
        }
