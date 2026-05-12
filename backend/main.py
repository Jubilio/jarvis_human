from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Jarvis Humanitário API", version="1.0.0")

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
def chat_with_jarvis(request: ChatRequest):
    # Por enquanto é um mock. Em breve conectaremos ao OpenAI/Ollama, LangChain e Earth Engine.
    user_message = request.message.lower()
    
    if "inundação" in user_message or "mapa" in user_message:
        response_text = "Entendido. Iniciando análise espacial. Vou buscar os dados mais recentes de satélite no Earth Engine e plotar no seu dashboard holográfico."
        action = "render_flood_map"
    else:
        response_text = "Módulo cognitivo principal em inicialização. Por enquanto opero com respostas pré-programadas. Como posso ajudar nas operações humanitárias hoje?"
        action = "none"
        
    return {
        "reply": response_text,
        "action": action,
        "data": {}
    }
