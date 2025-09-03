"""
Script para testar as rotas da API SABER Onboarding
"""
import requests
import json
from datetime import date, datetime

BASE_URL = "http://localhost:8000"

def test_api_endpoints():
    """Testa os principais endpoints da API"""
    
    print("🚀 Testando API SABER Onboarding...")
    
    # 1. Teste do endpoint raiz
    print("\n1. Testando endpoint raiz...")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"✅ Status: {response.status_code}")
        print(f"📝 Resposta: {response.json()}")
    except Exception as e:
        print(f"❌ Erro: {e}")
    
    # 2. Teste de health check
    print("\n2. Testando health check...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✅ Status: {response.status_code}")
        print(f"📝 Resposta: {response.json()}")
    except Exception as e:
        print(f"❌ Erro: {e}")
    
    # 3. Criar cliente
    print("\n3. Criando cliente...")
    cliente_data = {
        "nome": "TechStart Inovações Ltda",
        "cnpj": "98765432000123",
        "data_inicio_contrato": "2024-01-15",
        "contatos_empresa": [
            {
                "nome": "Ana Paula",
                "email": "ana@techstart.com.br",
                "telefone": "(11) 99888-7777",
                "cargo": "Diretora"
            }
        ],
        "canais": ["EMAIL", "WHATSAPP"],
        "status_onboarding": "INICIADO",
        "status_relacionamento": "PENDENTE",
        "responsavel_followup_id": 1,
        "observacoes": "Cliente de teste da API"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/v1/clientes/", json=cliente_data)
        print(f"✅ Status: {response.status_code}")
        if response.status_code == 201:
            cliente_criado = response.json()
            cliente_id = cliente_criado["id"]
            print(f"📝 Cliente criado com ID: {cliente_id}")
            print(f"   CNPJ formatado: {cliente_criado['cnpj']}")
        else:
            print(f"❌ Erro: {response.text}")
            return
    except Exception as e:
        print(f"❌ Erro: {e}")
        return
    
    # 4. Buscar clientes
    print("\n4. Buscando clientes...")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/clientes/")
        print(f"✅ Status: {response.status_code}")
        clientes = response.json()
        print(f"📝 Total de clientes: {len(clientes)}")
    except Exception as e:
        print(f"❌ Erro: {e}")
    
    # 5. Criar contato
    print("\n5. Criando contato...")
    contato_data = {
        "cliente_id": cliente_id,
        "tipo": "REUNIAO_INICIAL",
        "data": "2024-01-20",
        "hora_inicio": "14:00:00",
        "hora_fim": "15:30:00",
        "participantes": ["Ana Paula", "João Silva"],
        "descricao": "Reunião inicial para apresentação dos serviços",
        "canal": "VIDEOCHAMADA",
        "observacoes": "Cliente muito receptivo"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/v1/contatos/", json=contato_data)
        print(f"✅ Status: {response.status_code}")
        if response.status_code == 201:
            contato_criado = response.json()
            print(f"📝 Contato criado com ID: {contato_criado['id']}")
        else:
            print(f"❌ Erro: {response.text}")
    except Exception as e:
        print(f"❌ Erro: {e}")
    
    # 6. Criar visita
    print("\n6. Criando visita...")
    visita_data = {
        "cliente_id": cliente_id,
        "data": "2024-01-25",
        "local": "Escritório do cliente - São Paulo/SP",
        "tipo_visita": "INSTALACAO",
        "pauta": [
            "Instalação do sistema",
            "Treinamento da equipe",
            "Configurações iniciais"
        ],
        "assuntos": [
            "Sistema instalado com sucesso",
            "Equipe treinada adequadamente"
        ],
        "satisfacao": 9,
        "participantes": ["Ana Paula", "João Silva", "Equipe TI"],
        "observacoes": "Visita muito produtiva"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/v1/visitas/", json=visita_data)
        print(f"✅ Status: {response.status_code}")
        if response.status_code == 201:
            visita_criada = response.json()
            print(f"📝 Visita criada com ID: {visita_criada['id']}")
        else:
            print(f"❌ Erro: {response.text}")
    except Exception as e:
        print(f"❌ Erro: {e}")
    
    # 7. Dashboard
    print("\n7. Testando dashboard...")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/relacionamento/dashboard")
        print(f"✅ Status: {response.status_code}")
        if response.status_code == 200:
            dashboard = response.json()
            print(f"📝 Métricas do dashboard:")
            print(f"   - Total clientes: {dashboard['metricas']['resumo']['total_clientes']}")
            print(f"   - Clientes ativos: {dashboard['metricas']['resumo']['clientes_ativos']}")
            print(f"   - Satisfação média: {dashboard['metricas']['resumo']['satisfacao_media']}")
        else:
            print(f"❌ Erro: {response.text}")
    except Exception as e:
        print(f"❌ Erro: {e}")
    
    print("\n🎉 Testes da API concluídos!")

if __name__ == "__main__":
    test_api_endpoints()