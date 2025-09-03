"""
Script para testar os jobs automáticos
"""
import asyncio
import logging
from datetime import datetime, date, timedelta
from backend.database import SessionLocal
from backend.models import Usuario, Cliente, Agendamento, GoogleToken
from backend.jobs.sync_agendamentos import sync_agendamentos_job
from backend.jobs.remind_today import remind_today_job
from backend.services.google_service import GoogleService

# Configurar logging
logging.basicConfig(level=logging.INFO)

def criar_dados_teste():
    """Cria dados de teste para os jobs"""
    db = SessionLocal()
    
    try:
        # Criar usuário de teste
        usuario = Usuario(
            nome="Teste Job User",
            email="teste@saber.com.br", 
            papel="Colab. Onboarding",
            google_connected=False
        )
        db.add(usuario)
        db.commit()
        db.refresh(usuario)
        
        # Criar cliente de teste
        cliente = Cliente(
            nome="Cliente Teste Jobs",
            cnpj="11122233000144",
            data_inicio_contrato=date.today() - timedelta(days=5),
            status_onboarding="INICIADO",
            status_relacionamento="PENDENTE",
            responsavel_followup_id=usuario.id
        )
        db.add(cliente)
        db.commit()
        db.refresh(cliente)
        
        # Criar agendamento para teste do sync
        agendamento_sync = Agendamento(
            tipo="D15",
            cliente_id=cliente.id,
            responsavel_id=usuario.id,
            data_agendada=datetime.now() + timedelta(hours=2),
            titulo="Teste Sync - Reunião D+15",
            descricao="Agendamento de teste para sincronização",
            status="PENDENTE"
        )
        db.add(agendamento_sync)
        
        # Criar agendamento para hoje (teste remind)
        agendamento_hoje = Agendamento(
            tipo="REUNIAO_INICIAL",
            cliente_id=cliente.id,
            responsavel_id=usuario.id,
            data_agendada=datetime.combine(date.today(), datetime.min.time().replace(hour=14)),
            titulo="Teste Remind - Reunião Hoje",
            descricao="Agendamento de teste para lembrete diário", 
            status="PENDENTE"
        )
        db.add(agendamento_hoje)
        
        db.commit()
        
        print("✅ Dados de teste criados:")
        print(f"  - Usuário: {usuario.nome} (ID: {usuario.id})")
        print(f"  - Cliente: {cliente.nome} (ID: {cliente.id})")
        print(f"  - Agendamentos criados: 2")
        
        return usuario.id, cliente.id
        
    except Exception as e:
        print(f"❌ Erro ao criar dados de teste: {e}")
        db.rollback()
        return None, None
    finally:
        db.close()

def testar_sync_job():
    """Testa o job de sincronização"""
    print("\n🔄 Testando job sync_agendamentos...")
    
    try:
        sync_agendamentos_job()
        print("✅ Job sync_agendamentos executado (verifique logs)")
    except Exception as e:
        print(f"❌ Erro no job sync_agendamentos: {e}")

def testar_remind_job():
    """Testa o job de lembretes"""
    print("\n📧 Testando job remind_today...")
    
    try:
        remind_today_job()
        print("✅ Job remind_today executado (verifique logs)")
    except Exception as e:
        print(f"❌ Erro no job remind_today: {e}")

def testar_google_service():
    """Testa o serviço Google (sem credenciais reais)"""
    print("\n🔍 Testando GoogleService...")
    
    db = SessionLocal()
    try:
        # Teste sem credenciais (deve retornar None)
        credentials = GoogleService.get_user_credentials(db, 999)
        if credentials is None:
            print("✅ GoogleService.get_user_credentials retorna None para usuário sem tokens")
        else:
            print("❓ GoogleService retornou credenciais inesperadas")
            
    except Exception as e:
        print(f"❌ Erro no GoogleService: {e}")
    finally:
        db.close()

def main():
    """Função principal de teste"""
    print("🧪 Testando Jobs Automáticos SABER Onboarding\n")
    
    # 1. Criar dados de teste
    user_id, client_id = criar_dados_teste()
    
    if not user_id or not client_id:
        print("❌ Falha ao criar dados de teste. Encerrando.")
        return
    
    # 2. Testar GoogleService
    testar_google_service()
    
    # 3. Testar jobs (sem credenciais Google, mas deve executar a lógica)
    testar_sync_job()
    testar_remind_job()
    
    print("\n📋 Resumo:")
    print("- Os jobs foram executados em modo de teste")
    print("- Como não há credenciais Google configuradas, não foram enviados e-mails")
    print("- Para funcionar completamente, configure OAuth2 do Google")
    print("- Verifique os logs para detalhes da execução")
    
    print("\n🚀 Para ativar em produção:")
    print("1. Configure CLIENT_ID e CLIENT_SECRET do Google")
    print("2. Implemente fluxo OAuth2 para obter tokens")
    print("3. Os jobs executarão automaticamente conforme agendado")

if __name__ == "__main__":
    main()