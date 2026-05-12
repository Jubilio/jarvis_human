# 🦾 Jarvis Humanitário (Projeto Jarvis)

## Visão Geral
O **Jarvis Humanitário** é um sistema avançado de assistência IA focado no setor humanitário, cruzando informações geográficas (GIS), dados de satélite (Earth Engine) e capacidades de raciocínio de grandes modelos de linguagem (LLMs).
O objetivo é fornecer um dashboard conversacional que possa analisar dados de desastres, gerar relatórios automáticos e acionar alertas.

## 🏗️ Arquitetura
* **Cérebro Cognitivo**: OpenAI GPT
* **Backend de Alta Performance**: FastAPI (Python)
* **Interface Futurista**: React + Tailwind CSS v4 + Framer Motion
* **Motor Espacial (Planejado)**: Google Earth Engine, React Leaflet

## 🚀 Como Rodar o Projeto

### 1. Requisitos
* Python 3.10+
* Node.js 18+
* Chave de API da OpenAI

### 2. Configurações Ambientais (.env)
Dentro da pasta `backend/`, modifique o arquivo `.env` recém criado e insira a sua chave de API:
```env
OPENAI_API_KEY=sk-sua-chave-aqui
```

### 3. Rodando o Backend (O Cérebro)
Abra um terminal na raiz do projeto e execute:
```bash
cd backend
python -m venv venv
# No Windows:
.\venv\Scripts\activate

pip install -r requirements.txt
uvicorn main:app --reload
```
A API estará disponível em `http://127.0.0.1:8000`

### 4. Rodando o Frontend (A Interface)
Abra um segundo terminal:
```bash
cd frontend
npm install
npm run dev
```
A interface estará disponível em `http://localhost:5173`
