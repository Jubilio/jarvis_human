import httpx
import chromadb
from typing import Optional
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import AsyncOpenAI

# Sistema de Agentes
from agents import create_jarvis_agent, needs_agent

app = FastAPI(title="Jarvis AI OS API", version="3.0.0")

# === OLLAMA LOCAL ===
client = AsyncOpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"
)

# === CHROMADB - MEMÓRIA PERSISTENTE ===
chroma_client = chromadb.PersistentClient(path="./jarvis_memory")
memory_collection = chroma_client.get_or_create_collection("chat_history")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    lat: Optional[float] = None
    lon: Optional[float] = None

# ============================================================
# UTILITÁRIOS
# ============================================================

def save_to_memory(user_msg: str, jarvis_reply: str):
    timestamp = datetime.now().isoformat()
    memory_collection.add(
        documents=[f"Usuário: {user_msg}\nJarvis: {jarvis_reply}"],
        metadatas=[{"timestamp": timestamp, "type": "conversation"}],
        ids=[f"chat_{timestamp}"]
    )

def recall_memory(query: str, n: int = 3) -> str:
    count = memory_collection.count()
    if count == 0:
        return ""
    results = memory_collection.query(
        query_texts=[query],
        n_results=min(n, count)
    )
    if results and results["documents"]:
        return "\n---\n".join(results["documents"][0])
    return ""

async def get_weather(lat: float = -25.97, lon: float = 32.57) -> dict:
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code"
    )
    async with httpx.AsyncClient(timeout=10) as hclient:
        resp = await hclient.get(url)
        data = resp.json()
        current = data.get("current", {})
        return {
            "city": "Localização Atual" if lat != -25.97 else "Maputo",
            "temperature": current.get("temperature_2m", "N/A"),
            "humidity": current.get("relative_humidity_2m", "N/A"),
            "wind_speed": current.get("wind_speed_10m", "N/A"),
            "weather_code": current.get("weather_code", 0)
        }

def weather_code_to_label(code: int) -> str:
    if code == 0: return "Céu limpo"
    if code in [1, 2, 3]: return "Parcialmente nublado"
    if code in [45, 48]: return "Nevoeiro"
    if code in [51, 53, 55]: return "Garoa"
    if code in [61, 63, 65]: return "Chuva"
    if code in [80, 81, 82]: return "Aguaceiros"
    if code in [95, 96, 99]: return "Trovoada"
    return "Condição variável"

# ============================================================
# ENDPOINTS
# ============================================================

@app.get("/")
def read_root():
    return {"status": "online", "system": "Jarvis OS", "version": "3.0.0", "agents": "active"}

@app.get("/api/weather")
async def weather_endpoint(lat: float = -25.97, lon: float = 32.57):
    try:
        data = await get_weather(lat, lon)
        data["condition"] = weather_code_to_label(data["weather_code"])
        return data
    except Exception as e:
        return {"error": str(e), "city": "Desconhecida", "temperature": "N/A"}

@app.get("/api/memory")
def get_memory_stats():
    count = memory_collection.count()
    return {"total_memories": count, "status": "active"}

@app.post("/api/chat")
async def chat_with_jarvis(request: ChatRequest):
    user_message = request.message
    lat = request.lat
    lon = request.lon
    action = "none"
    if any(kw in user_message.lower() for kw in ["mapa", "inundação", "gis", "satélite"]):
        action = "render_flood_map"

    # === ROTA INTELIGENTE: Agente ou Chat Simples? ===
    if needs_agent(user_message):
        return await run_agent(user_message, action, lat, lon)
    else:
        return await run_simple_chat(user_message, action, lat, lon)

async def run_agent(user_message: str, action: str, lat: float = None, lon: float = None) -> dict:
    """Executa o agente LangChain com ferramentas reais."""
    try:
        past_context = recall_memory(user_message, n=2)
        full_query = user_message
        if past_context:
            full_query = f"{user_message}\n\n[Contexto de conversas anteriores]:\n{past_context}"
        
        # O agente corre de forma síncrona (LangChain ainda não é totalmente async com Ollama)
        import asyncio
        loop = asyncio.get_event_loop()
        agent = create_jarvis_agent()
        
        result = await loop.run_in_executor(
            None,
            lambda: agent.invoke({"input": full_query})
        )
        
        reply = result.get("output", "Não consegui processar a solicitação.")
        
        # Extrair ferramentas utilizadas dos passos intermédios
        tools_used = []
        for step in result.get("intermediate_steps", []):
            if step and len(step) > 0:
                action_obj = step[0]
                if hasattr(action_obj, 'tool'):
                    tools_used.append(action_obj.tool)
        
        save_to_memory(user_message, reply)
        
        return {
            "reply": reply,
            "action": action,
            "mode": "agent",
            "tools_used": list(set(tools_used))
        }
    except Exception as e:
        return {
            "reply": f"Erro no sistema de agentes: {str(e)}. Verifique se o Ollama está activo.",
            "action": "none",
            "mode": "agent_error",
            "tools_used": []
        }

async def run_simple_chat(user_message: str, action: str, lat: float = None, lon: float = None) -> dict:
    """Chat simples e rápido via OpenAI SDK → Ollama."""
    past_context = recall_memory(user_message, n=3)
    memory_section = f"\n\nMemórias de conversas anteriores:\n{past_context}" if past_context else ""

    try:
        weather = await get_weather(lat, lon) if lat and lon else await get_weather()
        weather_ctx = f"Clima actual no local do Mestre: {weather['temperature']}°C, Humidade: {weather['humidity']}%, Vento: {weather['wind_speed']}."
    except:
        weather_ctx = ""

    system_prompt = (
        "Você é o J.A.R.V.I.S., um assistente de IA ultra avançado. "
        "Responda de forma concisa, inteligente e com tom futurista. "
        f"Chame o utilizador de 'Mestre'. {weather_ctx}{memory_section}"
    )

    try:
        response = await client.chat.completions.create(
            model="llama3",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            max_tokens=400,
            temperature=0.7
        )
        reply = response.choices[0].message.content
        save_to_memory(user_message, reply)
        return {"reply": reply, "action": action, "mode": "chat", "tools_used": []}
    except Exception as e:
        error_msg = str(e)
        if "connection" in error_msg.lower() or "refused" in error_msg.lower():
            return {
                "reply": "Falha na conexão com o núcleo neural local. Verifique se o Ollama está em execução.",
                "action": "none", "mode": "error", "tools_used": []
            }
        return {"reply": f"Erro no sistema: {error_msg}", "action": "none", "mode": "error", "tools_used": []}
