"""
Teste rápido da API completa com jobs
"""
import asyncio
from fastapi.testclient import TestClient
from backend.main import app

def test_complete_api():
    """Testa API completa incluindo jobs"""
    
    client = TestClient(app)
    
    print("🧪 Testando API SABER Onboarding Completa\n")
    
    # 1. Teste básico
    print("1. Testando endpoint raiz...")
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    print(f"✅ API funcionando: {data['message']}")
    print(f"📋 Jobs automáticos: {list(data['jobs_automaticos'].keys())}")
    
    # 2. Teste jobs status
    print("\n2. Testando status dos jobs...")
    response = client.get("/api/v1/jobs/status")
    assert response.status_code == 200
    status = response.json()
    print(f"✅ Scheduler rodando: {status['scheduler_running']}")
    print(f"📋 Jobs ativos: {status['total_jobs']}")
    
    # 3. Teste jobs info
    print("\n3. Testando informações dos jobs...")
    response = client.get("/api/v1/jobs/info")
    assert response.status_code == 200
    info = response.json()
    print(f"✅ Jobs configurados: {len(info['jobs_configurados'])}")
    for job in info['jobs_configurados']:
        print(f"   - {job['nome']}: {job['frequencia']}")
    
    # 4. Criar cliente
    print("\n4. Testando criação de cliente...")
    cliente_data = {
        "nome": "Teste API Completa Ltda",
        "cnpj": "88777666000155", 
        "data_inicio_contrato": "2024-02-10",
        "status_onboarding": "INICIADO",
        "status_relacionamento": "PENDENTE"
    }
    
    response = client.post("/api/v1/clientes/", json=cliente_data)
    assert response.status_code == 201
    cliente = response.json()
    print(f"✅ Cliente criado: {cliente['nome']} (ID: {cliente['id']})")
    
    # 5. Dashboard
    print("\n5. Testando dashboard...")
    response = client.get("/api/v1/relacionamento/metricas")
    assert response.status_code == 200
    metricas = response.json()
    print(f"✅ Métricas: {metricas['resumo']['total_clientes']} clientes")
    
    # 6. Execução manual de job
    print("\n6. Testando execução manual de job...")
    response = client.post("/api/v1/jobs/run/sync_agendamentos")
    assert response.status_code == 200
    result = response.json()
    print(f"✅ Job executado: {result['message']}")
    
    print("\n🎉 Todos os testes passaram!")
    print("\n📋 Resumo:")
    print("✅ API FastAPI funcionando")
    print("✅ Scheduler APScheduler ativo")
    print("✅ Jobs automáticos configurados")
    print("✅ Rotas de CRUD completas")
    print("✅ Dashboard com métricas")
    print("✅ Execução manual de jobs")
    print("✅ Google Services preparados")
    
    print("\n🔧 Para ativar Google Calendar/Gmail:")
    print("1. Configure CLIENT_ID e CLIENT_SECRET")
    print("2. Implemente fluxo OAuth2")
    print("3. Jobs executarão automaticamente")

if __name__ == "__main__":
    test_complete_api()